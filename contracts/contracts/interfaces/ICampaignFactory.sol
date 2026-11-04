// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICampaignFactory
 * @notice Interface for CampaignFactory contract managing minimal proxy clones
 */
interface ICampaignFactory {
    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        uint256 goal,
        uint256 deadline,
        string metadataCID,
        uint256 feeBps
    );

    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event MinContributionUpdated(uint256 oldMin, uint256 newMin);
    event CampaignFlagged(address indexed campaignAddress, string reason);

    function createCampaign(
        uint256 goal,
        uint256 duration,
        string calldata metadataCID
    ) external returns (address campaignAddress);

    function owner() external view returns (address);
    function treasury() external view returns (address);
    function feeBps() external view returns (uint256);
    function minContribution() external view returns (uint256);
    function isCampaign(address campaign) external view returns (bool);
    function getAllCampaigns() external view returns (address[] memory);
    function getCampaignsCount() external view returns (uint256);
    function getCreatorCampaigns(address creator) external view returns (address[] memory);
}
