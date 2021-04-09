// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

interface CEtherInterface {

    /*** User Interface ***/

    function mint() external payable returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow() external payable returns (uint);
    function repayBorrowBehalf(address borrower) external payable returns (uint);
}