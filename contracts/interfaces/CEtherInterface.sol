// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

interface CEtherInterface {
    function isCEther() external returns (bool);

    /*** User Interface ***/

    function mint() external payable returns (uint256);

    function redeem(uint256 redeemTokens) external returns (uint256);

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

    function borrow(uint256 borrowAmount) external returns (uint256);

    function repayBorrow() external payable returns (uint256);

    function repayBorrowBehalf(address borrower) external payable returns (uint256);

    function balanceOfUnderlying(address account) external view returns (uint);
}
