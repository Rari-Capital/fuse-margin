// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IFuseMarginController } from "./interfaces/IFuseMarginController.sol";
import { CErc20Interface } from "./interfaces/CErc20Interface.sol";
import { CEtherInterface } from "./interfaces/CEtherInterface.sol";
import { ComptrollerInterface } from "./interfaces/ComptrollerInterface.sol";
import { IPosition } from "./interfaces/IPosition.sol";

contract Position is IPosition, Initializable {
    using SafeERC20 for IERC20;

    IFuseMarginController public override fuseMarginController;

    function initialize(IFuseMarginController _fuseMarginController) external override initializer {
        fuseMarginController = _fuseMarginController;
    }

    modifier onlyMargin() {
        require(fuseMarginController.approvedContracts(msg.sender), "Position: Not approved contract");
        _;
    }

    fallback() external payable {}

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

    function approveToken(
        address token,
        address to,
        uint256 amount
    ) external override onlyMargin {
        IERC20(token).safeApprove(to, amount);
    }

    function transferToken(
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
        require(CErc20Interface(cBase).mint(depositAmount) == 0, "Position: mint in mint failed");
    }

    function mintETH(address cBase) external payable override onlyMargin {
        require(CEtherInterface(cBase).mint{ value: msg.value }() == 0, "Position: mint in mintETH failed");
    }

    function enterMarkets(address comptroller, address[] calldata cTokens) external override onlyMargin {
        uint256[] memory errors = ComptrollerInterface(comptroller).enterMarkets(cTokens);
        for (uint256 i = 0; i < errors.length; i++) {
            require(errors[i] == 0, "Position: enterMarkets in enterMarkets failed");
        }
    }

    function exitMarket(address comptroller, address cToken) external override onlyMargin {
        require(ComptrollerInterface(comptroller).exitMarket(cToken) == 0, "Position: exitMarket in exitMarket failed");
    }

    function borrow(
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external override onlyMargin {
        require(CErc20Interface(cQuote).borrow(borrowAmount) == 0, "Position: borrow in borrow failed");
        IERC20(quote).safeTransfer(msg.sender, borrowAmount);
    }

    function borrowETH(address cQuote, uint256 borrowAmount) external override onlyMargin {
        require(CEtherInterface(cQuote).borrow(borrowAmount) == 0, "Position: borrow in borrowETH failed");
        payable(msg.sender).transfer(borrowAmount);
    }

    function repayBorrow(
        address quote,
        address cQuote,
        uint256 repayAmount
    ) external override onlyMargin {
        IERC20(quote).safeApprove(cQuote, repayAmount);
        require(CErc20Interface(cQuote).repayBorrow(repayAmount) == 0, "Position: repayBorrow in repayBorrow failed");
    }

    function repayBorrowETH(address cQuote) external payable override onlyMargin {
        require(
            CEtherInterface(cQuote).repayBorrow{ value: msg.value }() == 0,
            "Position: repayBorrow in repayBorrowETH failed"
        );
    }

    function redeem(
        address base,
        address cBase,
        uint256 redeemTokens
    ) external override onlyMargin {
        require(CErc20Interface(cBase).redeem(redeemTokens) == 0, "Position: redeem in redeem failed");
        IERC20(base).safeTransfer(msg.sender, IERC20(base).balanceOf(address(this)));
    }

    function redeemETH(address cBase, uint256 redeemTokens) external override onlyMargin {
        require(CErc20Interface(cBase).redeem(redeemTokens) == 0, "Position: redeem in redeemETH failed");
        payable(msg.sender).transfer(address(this).balance);
    }

    function redeemUnderlying(
        address base,
        address cBase,
        uint256 redeemAmount
    ) external override onlyMargin {
        require(
            CErc20Interface(cBase).redeemUnderlying(redeemAmount) == 0,
            "Position: redeemUnderlying in redeemUnderlying failed"
        );
        IERC20(base).safeTransfer(msg.sender, redeemAmount);
    }

    function redeemUnderlyingETH(address cBase, uint256 redeemAmount) external override onlyMargin {
        require(
            CEtherInterface(cBase).redeemUnderlying(redeemAmount) == 0,
            "Position: redeemUnderlying in redeemUnderlyingETH failed"
        );
        payable(msg.sender).transfer(redeemAmount);
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
        require(CErc20Interface(cBase).mint(depositAmount) == 0, "Position: mint in mintAndBorrow failed");

        address[] memory cTokens = new address[](1);
        cTokens[0] = cBase;
        uint256[] memory errors = ComptrollerInterface(comptroller).enterMarkets(cTokens);
        require(errors[0] == 0, "Position: enterMarkets in mintAndBorrow failed");

        require(CErc20Interface(cQuote).borrow(borrowAmount) == 0, "Position: borrow in mintAndBorrow failed");
        IERC20(quote).safeTransfer(msg.sender, borrowAmount);
    }

    function mintETHAndBorrow(
        address comptroller,
        address cBase,
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external payable override onlyMargin {
        require(CEtherInterface(cBase).mint{ value: msg.value }() == 0, "Position: mint in mintETHAndBorrow failed");

        address[] memory cTokens = new address[](1);
        cTokens[0] = cBase;
        uint256[] memory errors = ComptrollerInterface(comptroller).enterMarkets(cTokens);
        require(errors[0] == 0, "Position: enterMarkets in mintETHAndBorrow failed");

        require(CErc20Interface(cQuote).borrow(borrowAmount) == 0, "Position: borrow in mintETHAndBorrow failed");
        IERC20(quote).safeTransfer(msg.sender, borrowAmount);
    }

    function mintAndBorrowETH(
        address comptroller,
        address base,
        address cBase,
        address cQuote,
        uint256 depositAmount,
        uint256 borrowAmount
    ) external override onlyMargin {
        IERC20(base).safeApprove(cBase, depositAmount);
        require(CErc20Interface(cBase).mint(depositAmount) == 0, "Position: mint in mintAndBorrowETH failed");

        address[] memory cTokens = new address[](1);
        cTokens[0] = cBase;
        uint256[] memory errors = ComptrollerInterface(comptroller).enterMarkets(cTokens);
        require(errors[0] == 0, "Position: enterMarkets in mintAndBorrowETH failed");

        require(CEtherInterface(cQuote).borrow(borrowAmount) == 0, "Position: borrow in mintAndBorrowETH failed");
        payable(msg.sender).transfer(borrowAmount);
    }
}
