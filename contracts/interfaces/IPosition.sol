// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { IFuseMarginController } from "./IFuseMarginController.sol";

interface IPosition {
    function fuseMarginController() external returns (IFuseMarginController);

    function initialize(IFuseMarginController _fuseMarginController) external;

    function proxyCall(address target, bytes calldata callData)
        external
        payable
        returns (bool success, bytes memory result);

    function approveToken(
        address token,
        address to,
        uint256 amount
    ) external;

    function transferToken(
        address token,
        address to,
        uint256 amount
    ) external;

    function transferETH(address payable to, uint256 amount) external;

    function mint(
        address base,
        address cBase,
        uint256 depositAmount
    ) external;

    function mintETH(address cBase) external payable;

    function enterMarkets(address comptroller, address[] calldata cTokens) external;

    function exitMarket(address comptroller, address cToken) external;

    function borrow(
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external;

    function borrowETH(address cQuote, uint256 borrowAmount) external;

    function repayBorrow(
        address quote,
        address cQuote,
        uint256 repayAmount
    ) external;

    function repayBorrowETH(address cQuote) external payable;

    function redeem(
        address base,
        address cBase,
        uint256 redeemTokens
    ) external;

    function redeemETH(address cBase, uint256 redeemTokens) external;

    function redeemUnderlying(
        address base,
        address cBase,
        uint256 redeemAmount
    ) external;

    function redeemUnderlyingETH(address cBase, uint256 redeemAmount) external;

    function mintAndBorrow(
        address comptroller,
        address base,
        address cBase,
        address quote,
        address cQuote,
        uint256 depositAmount,
        uint256 borrowAmount
    ) external;

    function mintETHAndBorrow(
        address comptroller,
        address cBase,
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external payable;

    function mintAndBorrowETH(
        address comptroller,
        address base,
        address cBase,
        address cQuote,
        uint256 depositAmount,
        uint256 borrowAmount
    ) external;
}
