// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Campaign.sol";
import "./interfaces/ICampaignFactory.sol";

/**
 * @title CampaignFactory
 * @notice Factory that deploys minimal proxy clones (EIP-1167) for Crowdfunding Campaigns
 */
contract CampaignFactory is ICampaignFactory, Ownable2Step, Pausable {
    address public immutable campaignImplementation;
    address public override treasury;
    uint256 public override feeBps; // default 200 bps = 2%
    uint256 public constant MAX_FEE_BPS = 500; // Hard-coded cap of 5% (FR-30)

    uint256 public constant MIN_DURATION = 1 days;
    uint256 public constant MAX_DURATION = 90 days;
    uint256 public override minContribution = 0.001 ether;

    address[] public allCampaigns;
    mapping(address => address[]) public creatorCampaigns;
    mapping(address => bool) public override isCampaign;

    /**
     * @param _campaignImplementation Master logic contract for clones
     * @param _treasury Platform treasury address to receive fees
     * @param _feeBps Initial platform fee in basis points (e.g. 200 = 2%)
     */
    constructor(
        address _campaignImplementation,
        address _treasury,
        uint256 _feeBps
    ) Ownable(msg.sender) {
        require(_campaignImplementation != address(0), "Invalid implementation");
        require(_treasury != address(0), "Invalid treasury");
        require(_feeBps <= MAX_FEE_BPS, "Fee exceeds cap");

        campaignImplementation = _campaignImplementation;
        treasury = _treasury;
        feeBps = _feeBps;
    }

    /**
     * @notice Creates a new crowdfunding campaign clone
     * @param goal Amount of ETH needed (in wei)
     * @param duration Campaign duration in seconds (between 1 and 90 days)
     * @param metadataCID IPFS CID containing campaign details
     */
    function createCampaign(
        uint256 goal,
        uint256 duration,
        string calldata metadataCID
    ) external override whenNotPaused returns (address campaignAddress) {
        require(goal > 0, "Goal must be greater than 0");
        require(
            duration >= MIN_DURATION && duration <= MAX_DURATION,
            "Duration must be between 1 and 90 days"
        );
        require(bytes(metadataCID).length > 0, "Metadata CID cannot be empty");

        address clone = Clones.clone(campaignImplementation);
        uint256 deadline = block.timestamp + duration;

        Campaign(payable(clone)).initialize(
            msg.sender,
            goal,
            deadline,
            metadataCID,
            feeBps,
            treasury,
            minContribution
        );

        allCampaigns.push(clone);
        creatorCampaigns[msg.sender].push(clone);
        isCampaign[clone] = true;

        emit CampaignCreated(
            clone,
            msg.sender,
            goal,
            deadline,
            metadataCID,
            feeBps
        );

        return clone;
    }

    /**
     * @notice Admin function to update platform fee (capped at 5%)
     * Applies only to campaigns created after the change (FR-30)
     */
    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee exceeds 5% cap");
        uint256 oldFee = feeBps;
        feeBps = newFeeBps;
        emit FeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Admin function to update treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Admin function to update minimum contribution threshold
     */
    function setMinContribution(uint256 newMin) external onlyOwner {
        require(newMin > 0, "Minimum contribution must be > 0");
        uint256 oldMin = minContribution;
        minContribution = newMin;
        emit MinContributionUpdated(oldMin, newMin);
    }

    /**
     * @notice Emergency factory pause - prevents new campaign creation only
     * Never blocks refunds or withdrawals on existing campaigns (FR-29)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause factory
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Flag and cancel a fraudulent or violating campaign (FR-31)
     */
    function flagCampaign(address campaignAddress, string calldata reason) external onlyOwner {
        require(isCampaign[campaignAddress], "Unknown campaign");
        Campaign(payable(campaignAddress)).cancel();
        emit CampaignFlagged(campaignAddress, reason);
    }

    /**
     * @notice Return the factory owner
     */
    function owner() public view override(ICampaignFactory, Ownable) returns (address) {
        return super.owner();
    }

    /**
     * @notice Return all deployed campaign addresses
     */
    function getAllCampaigns() external view override returns (address[] memory) {
        return allCampaigns;
    }

    /**
     * @notice Get count of all campaigns
     */
    function getCampaignsCount() external view override returns (uint256) {
        return allCampaigns.length;
    }

    /**
     * @notice Return campaigns created by a specific address
     */
    function getCreatorCampaigns(address creator) external view override returns (address[] memory) {
        return creatorCampaigns[creator];
    }
}
