// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ICampaign.sol";
import "./interfaces/ICampaignFactory.sol";

/**
 * @title Campaign
 * @notice Logic contract for cloneable crowdfunding campaigns (EIP-1167 minimal proxy)
 */
contract Campaign is ICampaign {
    // Reentrancy guard state
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _reentrancyStatus;

    // Initialization state
    bool private _initialized;

    // Campaign parameters
    address public factory;
    address public creator;
    address public treasury;
    uint256 public goal;
    uint256 public deadline;
    string public metadataCID;
    uint256 public feeBps;
    uint256 public minContribution;

    // Financial & Lifecycle tracking
    uint256 public override totalRaised;
    uint256 public contributorCount;
    bool public withdrawn;
    bool public cancelled;

    mapping(address => uint256) public contributions;
    mapping(address => bool) public hasContributed;
    address[] public contributors;
    Update[] public updates;

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
        require(_deadline > block.timestamp, "Deadline must be future");
        require(bytes(_metadataCID).length > 0, "Metadata CID required");

        _initialized = true;
        _reentrancyStatus = _NOT_ENTERED;

        factory = msg.sender;
        creator = _creator;
        treasury = _treasury;
        goal = _goal;
        deadline = _deadline;
        metadataCID = _metadataCID;
        feeBps = _feeBps;
        minContribution = _minContribution;
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
     * @notice Contribute ETH to an active campaign
     */
    function contribute() external payable override nonReentrant {
        require(status() == CampaignStatus.Active, "Campaign is not active");
        require(msg.sender != creator, "Creator cannot contribute to own campaign");
        require(msg.value >= minContribution, "Contribution below minimum");

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        if (!hasContributed[msg.sender]) {
            hasContributed[msg.sender] = true;
            contributorCount++;
            contributors.push(msg.sender);
        }

        emit Contributed(msg.sender, msg.value, totalRaised);
    }

    /**
     * @notice Fallback function to allow contributing by sending ETH directly
     */
    receive() external payable {
        require(status() == CampaignStatus.Active, "Campaign is not active");
        require(msg.sender != creator, "Creator cannot contribute to own campaign");
        require(msg.value >= minContribution, "Contribution below minimum");

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        if (!hasContributed[msg.sender]) {
            hasContributed[msg.sender] = true;
            contributorCount++;
            contributors.push(msg.sender);
        }

        emit Contributed(msg.sender, msg.value, totalRaised);
    }

    /**
     * @notice Withdraw funds on successful campaign. Payout split happens atomically.
     */
    function withdraw() external override nonReentrant onlyCreator {
        require(status() == CampaignStatus.Successful, "Campaign not successful");
        require(!withdrawn, "Funds already withdrawn");

        withdrawn = true;

        uint256 balance = address(this).balance;
        uint256 feeAmount = (balance * feeBps) / 10000;
        uint256 creatorAmount = balance - feeAmount;

        if (feeAmount > 0) {
            (bool feeSent, ) = payable(treasury).call{value: feeAmount}("");
            require(feeSent, "Treasury transfer failed");
        }

        (bool creatorSent, ) = payable(creator).call{value: creatorAmount}("");
        require(creatorSent, "Creator transfer failed");

        emit Withdrawn(creator, creatorAmount, feeAmount);
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
            goal: goal,
            deadline: deadline,
            metadataCID: metadataCID,
            feeBps: feeBps,
            minContribution: minContribution,
            totalRaised: totalRaised,
            contributorCount: contributorCount,
            status: status(),
            withdrawn: withdrawn,
            cancelled: cancelled
        });
    }
}
