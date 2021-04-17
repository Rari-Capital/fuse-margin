// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import { IFuseMarginController } from "../interfaces/IFuseMarginController.sol";
import { IPosition } from "../interfaces/IPosition.sol";

abstract contract PositionBase is IPosition, Initializable {
    IFuseMarginController public override fuseMarginController;

    function initialize(IFuseMarginController _fuseMarginController) external override initializer {
        fuseMarginController = _fuseMarginController;
    }

    receive() external payable {}

    modifier onlyMargin() {
        require(fuseMarginController.approvedContracts(msg.sender), "Position: Not approved contract");
        _;
    }

    function proxyCall(address target, bytes calldata callData)
        external
        payable
        override
        onlyMargin
        returns (bool, bytes memory)
    {
        (bool success, bytes memory result) = target.call{ value: msg.value }(callData);
        return (success, result);
    }

    function transferETH(address payable to, uint256 amount) external override onlyMargin {
        to.transfer(amount);
    }
}
