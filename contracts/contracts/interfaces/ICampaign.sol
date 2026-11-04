// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICampaign
 * @notice Interface for individual Crowdfunding Campaign clones
 */
interface ICampaign {
    enum CampaignStatus {
        Active,
        Successful,
        Failed,
        Cancelled,
        Withdrawn
    }

    struct Update {
        string cid;
        uint256 timestamp;
    }

    struct CampaignDetails {
        address campaignAddress;
        address creator;
        address treasury;
        uint256 goal;
        uint256 deadline;
        string metadataCID;
        uint256 feeBps;
        uint256 minContribution;
        uint256 totalRaised;
        uint256 contributorCount;
        CampaignStatus status;
        bool withdrawn;
        bool cancelled;
    }

    event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised);
    event Withdrawn(address indexed creator, uint256 creatorAmount, uint256 feeAmount);
    event Refunded(address indexed contributor, uint256 amount);
    event Cancelled(address indexed caller);
    event UpdatePosted(string cid, uint256 timestamp);

    function initialize(
        address _creator,
        uint256 _goal,
        uint256 _deadline,
        string calldata _metadataCID,
        uint256 _feeBps,
        address _treasury,
        uint256 _minContribution
    ) external;

    function contribute() external payable;
    function withdraw() external;
    function refund() external;
    function cancel() external;
    function postUpdate(string calldata cid) external;

    function status() external view returns (CampaignStatus);
    function contributionOf(address contributor) external view returns (uint256);
    function totalRaised() external view returns (uint256);
    function getContributors() external view returns (address[] memory);
    function getUpdates() external view returns (Update[] memory);
    function getDetails() external view returns (CampaignDetails memory);
}
