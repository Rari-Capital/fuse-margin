// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IFuseMarginController } from "./interfaces/IFuseMarginController.sol";
import { CErc20Interface } from "./interfaces/CErc20Interface.sol";
import { CEtherInterface } from "./interfaces/CEtherInterface.sol";
import { ComptrollerInterface } from "./interfaces/ComptrollerInterface.sol";
import { IPositionV1 } from "./interfaces/IPositionV1.sol";

contract PositionV1 is IPositionV1, Initializable {
    using SafeERC20 for IERC20;

    IFuseMarginController public override fuseMarginController;

    function initialize(IFuseMarginController _fuseMarginController) external override initializer {
        fuseMarginController = _fuseMarginController;
    }

    modifier onlyMargin() {
        require(fuseMarginController.approvedContracts(msg.sender), "Position: Not approved contract");
        _;
    }

    function proxyCall(address target, bytes calldata callData)
        external
        payable
        override
        onlyMargin
        returns (bool success, bytes memory result)
    {
        (bool success, bytes memory result) = target.call{ value: msg.value }(callData);
    }

    function transferERC20(
        address token,
        address to,
        uint256 amount
    ) external override onlyMargin {
        IERC20(token).safeTransfer(to, amount);
    }

    function transferETH(address payable to, uint256 amount) external override onlyMargin {
        to.transfer(amount);
    }

    function mint(
        address base,
        address cBase,
        uint256 depositAmount
    ) external override onlyMargin {
        IERC20(base).safeApprove(cBase, depositAmount);
        CErc20Interface(cBase).mint(depositAmount);
    }

    function mintPayable(address cBase) external payable override onlyMargin {
        CEtherInterface(cBase).mint{ value: msg.value }();
    }

    function enterMarkets(address comptroller, address[] calldata cTokens) external override onlyMargin {
        ComptrollerInterface(comptroller).enterMarkets(cTokens);
    }

    function borrow(
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external override onlyMargin {
        CErc20Interface(cQuote).borrow(borrowAmount);
        IERC20(quote).safeTransfer(msg.sender, borrowAmount);
    }

    function borrowPayable(address cQuote, uint256 borrowAmount) external override onlyMargin {
        CEtherInterface(cQuote).borrow(borrowAmount);
        payable(msg.sender).transfer(borrowAmount);
    }

    function mintAndBorrow(
        address comptroller,
        address base,
        address cBase,
        address quote,
        address cQuote,
        uint256 depositAmount,
        uint256 borrowAmount
    ) external override onlyMargin {
        IERC20(base).safeApprove(cBase, depositAmount);
        CErc20Interface(cBase).mint(depositAmount);

        address[] memory cTokens = new address[](1);
        cTokens[0] = cBase;
        ComptrollerInterface(comptroller).enterMarkets(cTokens);

        CErc20Interface(cQuote).borrow(borrowAmount);
        IERC20(quote).safeTransfer(msg.sender, borrowAmount);
    }

    function mintPayableAndBorrow(
        address comptroller,
        address cBase,
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external payable override onlyMargin {
        CEtherInterface(cBase).mint{ value: msg.value }();

        address[] memory cTokens = new address[](1);
        cTokens[0] = cBase;
        ComptrollerInterface(comptroller).enterMarkets(cTokens);

        CErc20Interface(cQuote).borrow(borrowAmount);
        IERC20(quote).safeTransfer(msg.sender, borrowAmount);
    }

    function mintAndBorrowPayable(
        address comptroller,
        address base,
        address cBase,
        address cQuote,
        uint256 depositAmount,
        uint256 borrowAmount
    ) external override onlyMargin {
        IERC20(base).safeApprove(cBase, depositAmount);
        CErc20Interface(cBase).mint(depositAmount);

        address[] memory cTokens = new address[](1);
        cTokens[0] = cBase;
        ComptrollerInterface(comptroller).enterMarkets(cTokens);

        CEtherInterface(cQuote).borrow(borrowAmount);
        payable(msg.sender).transfer(borrowAmount);
    }
}
