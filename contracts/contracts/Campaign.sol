// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./interfaces/ICampaign.sol";
import "./interfaces/ICampaignFactory.sol";

/**
 * @title Campaign
 * @notice Logic contract for cloneable crowdfunding campaigns (EIP-1167 minimal proxy)
 */
contract Campaign is ICampaign {
    // Slot 0 (32 bytes)
    address public creator;        // 20 bytes
    uint64 public deadline;        // 8 bytes
    uint16 public feeBps;          // 2 bytes
    bool public withdrawn;         // 1 byte
    bool public cancelled;         // 1 byte

    // Slot 1 (22 bytes)
    address public factory;        // 20 bytes
    uint8 private _reentrancyStatus;// 1 byte
    bool private _initialized;     // 1 byte

    // Slot 2 (20 bytes)
    address public treasury;       // 20 bytes

    // Slot 3 (32 bytes)
    uint128 public goal;           // 16 bytes
    uint128 public minContribution;// 16 bytes

    // Financial & Lifecycle tracking
    uint256 public override totalRaised; // Slot 4
    uint256 public override feeOwed;     // Slot 5
    string public metadataCID;           // Slot 6

    mapping(address => uint256) public contributions; // Slot 7
    address[] public contributors;                     // Slot 8
    Update[] public updates;                           // Slot 9

    uint8 private constant _NOT_ENTERED = 1;
    uint8 private constant _ENTERED = 2;

    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator permitted");
        _;
    }

    modifier onlyFactoryOrCreator() {
        require(
            msg.sender == creator ||
            msg.sender == factory ||
            msg.sender == ICampaignFactory(factory).owner(),
            "Unauthorized"
        );
        _;
    }

    /**
     * @notice Prevents the implementation contract from being initialized directly
     */
    constructor() {
        _initialized = true;
        _reentrancyStatus = _NOT_ENTERED;
    }

    /**
     * @notice Initializes the cloned campaign instance
     * @param _creator Campaign owner address
     * @param _goal Fundraising goal in wei
     * @param _deadline Timestamp marking campaign end
     * @param _metadataCID IPFS CID containing description, images, category
     * @param _feeBps Platform fee in basis points (e.g. 200 = 2%)
     * @param _treasury Platform treasury address
     * @param _minContribution Minimum contribution in wei
     */
    function initialize(
        address _creator,
        uint256 _goal,
        uint256 _deadline,
        string calldata _metadataCID,
        uint256 _feeBps,
        address _treasury,
        uint256 _minContribution
    ) external override {
        require(!_initialized, "Already initialized");
        require(_creator != address(0), "Invalid creator");
        require(_treasury != address(0), "Invalid treasury");
        require(_goal > 0, "Goal must be > 0");
        require(_goal <= type(uint128).max, "Goal overflow");
        require(_deadline > block.timestamp, "Deadline must be future");
        require(_deadline <= type(uint64).max, "Deadline overflow");
        require(bytes(_metadataCID).length > 0, "Metadata CID required");
        require(_minContribution <= type(uint128).max, "Min contribution overflow");

        _initialized = true;
        _reentrancyStatus = _NOT_ENTERED;

        creator = _creator;
        deadline = uint64(_deadline);
        feeBps = uint16(_feeBps);

        factory = msg.sender;
        treasury = _treasury;
        goal = uint128(_goal);
        minContribution = uint128(_minContribution);
        metadataCID = _metadataCID;
    }

    /**
     * @notice Derives real-time campaign status based on current block timestamp and contract state
     */
    function status() public view override returns (CampaignStatus) {
        if (cancelled) {
            return CampaignStatus.Cancelled;
        }
        if (withdrawn) {
            return CampaignStatus.Withdrawn;
        }
        if (block.timestamp < deadline) {
            return CampaignStatus.Active;
        }
        if (totalRaised >= goal) {
            return CampaignStatus.Successful;
        }
        return CampaignStatus.Failed;
    }

    /**
     * @notice Number of unique contributors
     */
    function contributorCount() external view override returns (uint256) {
        return contributors.length;
    }

    /**
     * @notice Contribute ETH to an active campaign
     */
    function contribute() external payable override nonReentrant {
        _contribute();
    }

    /**
     * @notice Fallback function to allow contributing by sending ETH directly
     */
    receive() external payable {
        require(_reentrancyStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = _ENTERED;
        _contribute();
        _reentrancyStatus = _NOT_ENTERED;
    }

    function _contribute() internal {
        require(status() == CampaignStatus.Active, "Campaign is not active");
        require(msg.sender != creator, "Creator cannot contribute to own campaign");
        require(msg.value >= minContribution, "Contribution below minimum");

        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
        }

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit Contributed(msg.sender, msg.value, totalRaised);
    }

    /**
     * @notice Withdraw funds on successful campaign to the creator
     */
    function withdraw() external override {
        _withdrawTo(payable(creator));
    }

    /**
     * @notice Withdraw funds to a specified recipient (e.g. if creator contract has no receive())
     * @param to Recipient address of the creator payout
     */
    function withdrawTo(address payable to) external override {
        require(to != address(0), "Invalid recipient");
        _withdrawTo(to);
    }

    function _withdrawTo(address payable to) internal nonReentrant onlyCreator {
        require(status() == CampaignStatus.Successful, "Campaign not successful");
        require(!withdrawn, "Funds already withdrawn");

        withdrawn = true;

        uint256 feeAmount = (totalRaised * uint256(feeBps)) / 10000;
        uint256 creatorAmount = totalRaised - feeAmount;
        feeOwed += feeAmount;

        (bool creatorSent, ) = to.call{value: creatorAmount}("");
        require(creatorSent, "Creator transfer failed");

        emit Withdrawn(creator, creatorAmount, feeAmount);
    }

    /**
     * @notice Pull-based fee claiming for platform treasury. Anyone may call.
     */
    function claimFee() external override nonReentrant {
        uint256 amount = feeOwed;
        require(amount > 0, "No fee owed");

        feeOwed = 0;

        (bool feeSent, ) = payable(treasury).call{value: amount}("");
        require(feeSent, "Treasury transfer failed");

        emit FeeClaimed(treasury, amount);
    }

    /**
     * @notice Pull-based refund mechanism for contributors on failed or cancelled campaigns
     */
    function refund() external override nonReentrant {
        CampaignStatus currentStatus = status();
        require(
            currentStatus == CampaignStatus.Failed || currentStatus == CampaignStatus.Cancelled,
            "Refund not available"
        );

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "No contribution to refund");

        // Checks-Effects-Interactions: clear balance before sending ETH
        contributions[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund transfer failed");

        emit Refunded(msg.sender, amount);
    }

    /**
     * @notice Cancel campaign before any contributions exist (creator) or emergency policy delist (factory owner)
     */
    function cancel() external override onlyFactoryOrCreator {
        require(!cancelled && !withdrawn, "Campaign already finalized");

        if (msg.sender == creator) {
            require(totalRaised == 0, "Cannot cancel after receiving contributions");
            require(block.timestamp < deadline, "Cannot cancel after deadline");
        } else {
            // When caller is NOT the creator (factory or factory owner), campaign MUST be Active
            require(status() == CampaignStatus.Active, "Only active campaigns can be cancelled");
        }

        cancelled = true;
        emit Cancelled(msg.sender);
    }

    /**
     * @notice Post project milestone updates
     * @param cid IPFS CID of the update text/media
     */
    function postUpdate(string calldata cid) external override onlyCreator {
        require(bytes(cid).length > 0, "Update CID cannot be empty");
        updates.push(Update({cid: cid, timestamp: block.timestamp}));
        emit UpdatePosted(cid, block.timestamp);
    }

    /**
     * @notice Query contribution amount of a specific wallet
     */
    function contributionOf(address contributor) external view override returns (uint256) {
        return contributions[contributor];
    }

    /**
     * @notice Retrieve paginated list of contributors
     */
    function getContributors(uint256 offset, uint256 limit) external view override returns (address[] memory) {
        uint256 total = contributors.length;
        if (offset >= total || limit == 0) {
            return new address[](0);
        }
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        uint256 size = end - offset;
        address[] memory result = new address[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = contributors[offset + i];
        }
        return result;
    }

    /**
     * @notice Retrieve list of all contributors
     */
    function getContributors() external view override returns (address[] memory) {
        return contributors;
    }

    /**
     * @notice Retrieve all campaign updates
     */
    function getUpdates() external view override returns (Update[] memory) {
        return updates;
    }

    /**
     * @notice Get consolidated campaign details in one call
     */
    function getDetails() external view override returns (CampaignDetails memory) {
        return CampaignDetails({
            campaignAddress: address(this),
            creator: creator,
            treasury: treasury,
            goal: uint256(goal),
            deadline: uint256(deadline),
            metadataCID: metadataCID,
            feeBps: uint256(feeBps),
            minContribution: uint256(minContribution),
            totalRaised: totalRaised,
            contributorCount: contributors.length,
            status: status(),
            withdrawn: withdrawn,
            cancelled: cancelled
        });
    }
}
