// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { CErc20Interface } from "./interfaces/CErc20Interface.sol";
import { CEtherInterface } from "./interfaces/CEtherInterface.sol";
import { ComptrollerInterface } from "./interfaces/ComptrollerInterface.sol";
import { PositionBase } from "./Position/PositionBase.sol";

/// @author Ganesh Gautham Elango
/// @title Position contract to be cloned for each position
contract Position is PositionBase {
    using SafeERC20 for IERC20;

    /// @dev Approves token spending
    /// @param token Token address
    /// @param to Approve to address
    /// @param amount Amount to approve
    function approveToken(
        address token,
        address to,
        uint256 amount
    ) external override onlyMargin {
        IERC20(token).safeApprove(to, amount);
    }

    /// @dev Transfers token balance
    /// @param token Token address
    /// @param to Transfer to address
    /// @param amount Amount to transfer
    function transferToken(
        address token,
        address to,
        uint256 amount
    ) external override onlyMargin {
        IERC20(token).safeTransfer(to, amount);
    }

    /// @dev Deposits token into pool, must have transferred the token to this contract before calling
    /// @param base Token to deposit
    /// @param cBase Equivalent cToken address
    /// @param depositAmount Amount to deposit
    function mint(
        address base,
        address cBase,
        uint256 depositAmount
    ) external override onlyMargin {
        IERC20(base).safeApprove(cBase, depositAmount);
        require(CErc20Interface(cBase).mint(depositAmount) == 0, "Position: mint in mint failed");
    }

    /// @dev Deposits ETH into pool, must call this function with ETH value
    /// @param cBase cEther address
    function mintETH(address cBase) external payable override onlyMargin {
        CEtherInterface(cBase).mint{ value: msg.value }();
    }

    /// @dev Enable tokens as collateral
    /// @param comptroller Address of Comptroller for the pool
    /// @param cTokens List of cToken addresses to enable as collateral
    function enterMarkets(address comptroller, address[] calldata cTokens) external override onlyMargin {
        uint256[] memory errors = ComptrollerInterface(comptroller).enterMarkets(cTokens);
        for (uint256 i = 0; i < errors.length; i++) {
            require(errors[i] == 0, "Position: enterMarkets in enterMarkets failed");
        }
    }

    /// @dev Disable a token as collateral
    /// @param comptroller Address of Comptroller for the pool
    /// @param cToken Token to disable
    function exitMarket(address comptroller, address cToken) external override onlyMargin {
        require(ComptrollerInterface(comptroller).exitMarket(cToken) == 0, "Position: exitMarket in exitMarket failed");
    }

    /// @dev Borrow a token, must have first called enterMarkets for the base collateral
    /// @param quote Token to borrow
    /// @param cQuote Equivalent cToken
    /// @param borrowAmount Amount to borrow
    function borrow(
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external override onlyMargin {
        require(CErc20Interface(cQuote).borrow(borrowAmount) == 0, "Position: borrow in borrow failed");
        IERC20(quote).safeTransfer(msg.sender, borrowAmount);
    }

    /// @dev Borrow ETH, must have first called enterMarkets for the base collateral
    /// @param cQuote cEther address
    /// @param borrowAmount Amount to borrow
    function borrowETH(address cQuote, uint256 borrowAmount) external override onlyMargin {
        require(CEtherInterface(cQuote).borrow(borrowAmount) == 0, "Position: borrow in borrowETH failed");
        payable(msg.sender).transfer(borrowAmount);
    }

    /// @dev Repay borrowed token, must have transferred the token to this contract before calling
    /// @param quote Token to repay
    /// @param cQuote Equivalent cToken
    /// @param repayAmount Amount to repay
    function repayBorrow(
        address quote,
        address cQuote,
        uint256 repayAmount
    ) external override onlyMargin {
        IERC20(quote).safeApprove(cQuote, repayAmount);
        require(CErc20Interface(cQuote).repayBorrow(repayAmount) == 0, "Position: repayBorrow in repayBorrow failed");
    }

    /// @dev Repay borrowed ETH, must call this function with ETH value
    /// @param cQuote cEther address
    function repayBorrowETH(address cQuote) external payable override onlyMargin {
        CEtherInterface(cQuote).repayBorrow{ value: msg.value }();
    }

    /// @dev Withdraw token from pool, given cToken amount
    /// @param base Token to withdraw
    /// @param cBase Equivalent cToken
    /// @param redeemTokens Amount of cToken to withdraw
    function redeem(
        address base,
        address cBase,
        uint256 redeemTokens
    ) external override onlyMargin {
        require(CErc20Interface(cBase).redeem(redeemTokens) == 0, "Position: redeem in redeem failed");
        IERC20(base).safeTransfer(msg.sender, IERC20(base).balanceOf(address(this)));
    }

    /// @dev Withdraw ETH from pool, given cEther amount
    /// @param cBase cEther address
    /// @param redeemTokens Amount of cEthers to withdraw
    function redeemETH(address cBase, uint256 redeemTokens) external override onlyMargin {
        require(CErc20Interface(cBase).redeem(redeemTokens) == 0, "Position: redeem in redeemETH failed");
        payable(msg.sender).transfer(address(this).balance);
    }

    /// @dev Withdraw token from pool, given token amount
    /// @param base Token to withdraw
    /// @param cBase Equivalent cToken
    /// @param redeemAmount Amount of token to withdraw
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

    /// @dev Withdraw ETH from pool, given ETH amount
    /// @param cBase cEther
    /// @param redeemAmount Amount of ETH to withdraw
    function redeemUnderlyingETH(address cBase, uint256 redeemAmount) external override onlyMargin {
        require(
            CEtherInterface(cBase).redeemUnderlying(redeemAmount) == 0,
            "Position: redeemUnderlying in redeemUnderlyingETH failed"
        );
        payable(msg.sender).transfer(redeemAmount);
    }

    /// @dev Deposits a token, enables it as collateral and borrows a token,
    ///      must have transferred the deposit token to this contract before calling
    /// @param comptroller Address of Comptroller for the pool
    /// @param base Token to deposit
    /// @param cBase Equivalent cToken
    /// @param quote Token to borrow
    /// @param cQuote Equivalent cToken
    /// @param depositAmount Amount of base to deposit
    /// @param borrowAmount Amount of quote to borrow
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

    /// @dev Deposits ETH, enables it as collateral and borrows a token, must call this function with ETH value
    /// @param comptroller Address of Comptroller for the pool
    /// @param cBase cEther
    /// @param quote Token to borrow
    /// @param cQuote Equivalent cToken
    /// @param borrowAmount Amount of quote to borrow
    function mintETHAndBorrow(
        address comptroller,
        address cBase,
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external payable override onlyMargin {
        CEtherInterface(cBase).mint{ value: msg.value }();

        address[] memory cTokens = new address[](1);
        cTokens[0] = cBase;
        uint256[] memory errors = ComptrollerInterface(comptroller).enterMarkets(cTokens);
        require(errors[0] == 0, "Position: enterMarkets in mintETHAndBorrow failed");

        require(CErc20Interface(cQuote).borrow(borrowAmount) == 0, "Position: borrow in mintETHAndBorrow failed");
        IERC20(quote).safeTransfer(msg.sender, borrowAmount);
    }

    /// @dev Deposits a token, enables it as collateral and borrows ETH,
    ///      must have transferred the deposit token to this contract before calling
    /// @param comptroller Address of Comptroller for the pool
    /// @param base Token to deposit
    /// @param cBase Equivalent cToken
    /// @param cQuote cEther
    /// @param depositAmount Amount of base to deposit
    /// @param borrowAmount Amount of ETH to borrow
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

    /// @dev Repay quote and redeem base, must have transferred the repay token to this contract before calling
    /// @param base Token to redeem
    /// @param cBase Equivalent cToken
    /// @param quote Token to repay
    /// @param cQuote Equivalent cToken
    /// @param redeemTokens Amount of cTokens to redeem
    /// @param repayAmount Amount to repay    
    function repayAndRedeem(
        address base,
        address cBase,
        address quote,
        address cQuote,
        uint256 redeemTokens,
        uint256 repayAmount        
    ) external override onlyMargin {
        IERC20(quote).safeApprove(cQuote, repayAmount);
        require(CErc20Interface(cQuote).repayBorrow(repayAmount) == 0, "Position: repayBorrow in repayAndRedeem failed");

        require(CErc20Interface(cBase).redeem(redeemTokens) == 0, "Position: redeem in repayAndRedeem failed");
        IERC20(base).safeTransfer(msg.sender, IERC20(base).balanceOf(address(this)));
    }

    /// @dev Repay quote and redeem base, must call this function with ETH value
    /// @param base Token to redeem
    /// @param cBase Equivalent cToken
    /// @param cQuote cEther address
    /// @param redeemTokens Amount of cTokens to redeem
    function repayETHAndRedeem(
        address base,
        address cBase,
        address cQuote,
        uint256 redeemTokens
    ) external payable override onlyMargin {
        CEtherInterface(cQuote).repayBorrow{ value: msg.value }();

        require(CErc20Interface(cBase).redeem(redeemTokens) == 0, "Position: redeem in repayETHAndRedeem failed");
        IERC20(base).safeTransfer(msg.sender, IERC20(base).balanceOf(address(this)));
    }

    /// @dev Repay quote and redeem base, must have transferred the repay token to this contract before calling
    /// @param cBase cEther address
    /// @param quote Token to repay
    /// @param cQuote Equivalent cToken
    /// @param redeemTokens Amount of cEther to redeem
    /// @param repayAmount Amount to repay    
    function repayAndRedeemETH(
        address cBase,
        address quote,
        address cQuote,
        uint256 redeemTokens,
        uint256 repayAmount        
    ) external override onlyMargin {
        IERC20(quote).safeApprove(cQuote, repayAmount);
        require(CErc20Interface(cQuote).repayBorrow(repayAmount) == 0, "Position: repayBorrow in repayAndRedeemETH failed");

        require(CErc20Interface(cBase).redeem(redeemTokens) == 0, "Position: redeem in repayAndRedeemETH failed");
        payable(msg.sender).transfer(address(this).balance);
    }
}
