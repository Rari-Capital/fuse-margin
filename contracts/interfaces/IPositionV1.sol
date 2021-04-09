// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { IFuseMarginController } from "./IFuseMarginController.sol";

interface IPositionV1 {
    function fuseMarginController() external returns (IFuseMarginController);

    function initialize(IFuseMarginController _fuseMarginController) external;

    function proxyCall(address target, bytes calldata callData)
        external
        payable
        returns (bool success, bytes memory result);

    function transferERC20(
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

    function mintPayable(address cBase) external payable;

    function enterMarkets(address comptroller, address[] calldata cTokens) external;

    function borrow(
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external;

    function borrowPayable(address cQuote, uint256 borrowAmount) external;

    function mintAndBorrow(
        address comptroller,
        address base,
        address cBase,
        address quote,
        address cQuote,
        uint256 depositAmount,
        uint256 borrowAmount
    ) external;

    function mintPayableAndBorrow(
        address comptroller,
        address cBase,
        address quote,
        address cQuote,
        uint256 borrowAmount
    ) external payable;

    function mintAndBorrowPayable(
        address comptroller,
        address base,
        address cBase,
        address cQuote,
        uint256 depositAmount,
        uint256 borrowAmount
    ) external;
}
