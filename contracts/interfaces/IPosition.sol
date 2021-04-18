// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0;

import { IFuseMarginController } from "./IFuseMarginController.sol";

/// @author Ganesh Gautham Elango
/// @title Position interface
interface IPosition {
    /// @dev Points to immutable FuseMarginController instance
    function fuseMarginController() external returns (IFuseMarginController);

    /// @dev Initializes the contract once after creation
    /// @param _fuseMarginController Address of FuseMarginController
    function initialize(IFuseMarginController _fuseMarginController) external;

    /// @dev Allows for generalized calls through this position
    /// @param target Contract address to call
    /// @param callData ABI encoded function/params
    /// @return Whether call was successful
    /// @return Return bytes
    function proxyCall(address target, bytes calldata callData) external payable returns (bool, bytes memory);

    /// @dev Transfer ETH balance
    /// @param to Address to send to
    /// @param amount Amount of ETH to send
    function transferETH(address payable to, uint256 amount) external;

    /// @dev Approves token spending
    /// @param token Token address
    /// @param to Approve to address
    /// @param amount Amount to approve
    function approveToken(
        address token,
        address to,
        uint256 amount
    ) external;

    /// @dev Transfers token balance
    /// @param token Token address
    /// @param to Transfer to address
    /// @param amount Amount to transfer
    function transferToken(
        address token,
        address to,
        uint256 amount
    ) external;

    /// @dev Deposits token into pool, must have transferred the token to this contract before calling
    /// @param base Token to deposit
    /// @param cBase Equivalent cToken address
    /// @param depositAmount Amount to deposit
    function mint(
        address base,
        address cBase,
        uint256 depositAmount
    ) external;

    /// @dev Deposits ETH into pool, must call this function with ETH value
    /// @param cBase cEther address
    function mintETH(address cBase) external payable;

    /// @dev Enable tokens as collateral
    /// @param comptroller Address of Comptroller for the pool
    /// @param cTokens List of cToken addresses to enable as collateral
    function enterMarkets(address comptroller, address[] calldata cTokens) external;

    /// @dev Disable a token as collateral
    /// @param comptroller Address of Comptroller for the pool
    /// @param cToken Token to disable
    function exitMarket(address comptroller, address cToken) external;

    /// @dev Borrow a token, must have first called enterMarkets for the base collateral
    /// @param quote Token to borrow
    /// @param cQuote Equivalent cToken
    /// @param borrowAmount Amount to borrow
    function borrow(
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external;

    /// @dev Borrow ETH, must have first called enterMarkets for the base collateral
    /// @param cQuote cEther address
    /// @param borrowAmount Amount to borrow
    function borrowETH(address cQuote, uint256 borrowAmount) external;

    /// @dev Repay borrowed token, must have transferred the token to this contract before calling
    /// @param quote Token to repay
    /// @param cQuote Equivalent cToken
    /// @param repayAmount Amount to repay
    function repayBorrow(
        address quote,
        address cQuote,
        uint256 repayAmount
    ) external;

    /// @dev Repay borrowed ETH, must call this function with ETH value
    /// @param cQuote cEther address
    function repayBorrowETH(address cQuote) external payable;

    /// @dev Withdraw token from pool, given cToken amount
    /// @param base Token to withdraw
    /// @param cBase Equivalent cToken
    /// @param redeemTokens Amount of cToken to withdraw
    function redeem(
        address base,
        address cBase,
        uint256 redeemTokens
    ) external;

    /// @dev Withdraw ETH from pool, given cEther amount
    /// @param cBase cEther address
    /// @param redeemTokens Amount of cEthers to withdraw
    function redeemETH(address cBase, uint256 redeemTokens) external;

    /// @dev Withdraw token from pool, given token amount
    /// @param base Token to withdraw
    /// @param cBase Equivalent cToken
    /// @param redeemAmount Amount of token to withdraw
    function redeemUnderlying(
        address base,
        address cBase,
        uint256 redeemAmount
    ) external;

    /// @dev Withdraw ETH from pool, given ETH amount
    /// @param cBase cEther
    /// @param redeemAmount Amount of ETH to withdraw
    function redeemUnderlyingETH(address cBase, uint256 redeemAmount) external;

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
    ) external;

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
    ) external payable;

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
    ) external;

    /// @dev Repay quote and redeem base, must have transferred the repay token to this contract before calling
    /// @param base Token to redeem
    /// @param cBase Equivalent cToken
    /// @param quote Token to repay
    /// @param cQuote Equivalent cToken
    /// @param repayAmount Amount to repay
    /// @param redeemTokens Amount of cTokens to redeem
    function repayAndRedeem(
        address base,
        address cBase,
        address quote,
        address cQuote,
        uint256 repayAmount,
        uint256 redeemTokens
    ) external;

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
    ) external payable;

    /// @dev Repay quote and redeem base, must have transferred the repay token to this contract before calling
    /// @param cBase cEther address
    /// @param quote Token to repay
    /// @param cQuote Equivalent cToken
    /// @param repayAmount Amount to repay
    /// @param redeemTokens Amount of cEther to redeem
    function repayAndRedeemETH(
        address cBase,
        address quote,
        address cQuote,
        uint256 repayAmount,
        uint256 redeemTokens
    ) external;
}
