// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../interfaces/ICampaign.sol";
import "../interfaces/ICampaignFactory.sol";

/**
 * @notice Treasury that can toggle reverting on receive
 */
contract RevertingTreasury {
    bool public shouldRevert = true;

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    receive() external payable {
        if (shouldRevert) {
            revert("Treasury rejection");
        }
    }
}

/**
 * @notice Helper to force-send ETH to any contract via selfdestruct
 */
contract ForceSender {
    constructor() payable {}

    function forceSend(address payable recipient) external {
        selfdestruct(recipient);
    }
}

/**
 * @notice Creator contract with NO payable receive/fallback function
 */
contract NoReceiveCreator {
    function createCampaignOnFactory(
        address factory,
        uint256 goal,
        uint256 duration,
        string calldata metadataCID
    ) external returns (address) {
        return ICampaignFactory(factory).createCampaign(goal, duration, metadataCID);
    }

    function callWithdraw(address campaign) external {
        ICampaign(campaign).withdraw();
    }

    function callWithdrawTo(address campaign, address payable to) external {
        ICampaign(campaign).withdrawTo(to);
    }
}

/**
 * @notice Reentrancy attacker for refund()
 */
contract RefundAttacker {
    ICampaign public targetCampaign;
    uint256 public attackCount;

    constructor(address _target) {
        targetCampaign = ICampaign(_target);
    }

    function attack() external payable {
        targetCampaign.contribute{value: msg.value}();
    }

    function triggerRefund() external {
        targetCampaign.refund();
    }

    receive() external payable {
        attackCount++;
        if (attackCount < 3) {
            targetCampaign.refund();
        }
    }
}

/**
 * @notice Reentrancy attacker for withdraw()
 */
contract WithdrawAttacker {
    ICampaign public targetCampaign;
    uint256 public attackCount;

    function setTarget(address _target) external {
        targetCampaign = ICampaign(_target);
    }

    function triggerWithdraw() external {
        targetCampaign.withdraw();
    }

    receive() external payable {
        attackCount++;
        if (attackCount < 3 && address(targetCampaign) != address(0)) {
            targetCampaign.withdraw();
        }
    }
}

/**
 * @notice Reentrancy attacker for claimFee()
 */
contract ClaimFeeAttacker {
    ICampaign public targetCampaign;
    uint256 public attackCount;

    function setTarget(address _target) external {
        targetCampaign = ICampaign(_target);
    }

    function triggerClaimFee() external {
        targetCampaign.claimFee();
    }

    receive() external payable {
        attackCount++;
        if (attackCount < 3 && address(targetCampaign) != address(0)) {
            targetCampaign.claimFee();
        }
    }
}
