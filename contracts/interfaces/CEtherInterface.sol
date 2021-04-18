// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.5.16;

interface CEtherInterface {
    function isCEther() external returns (bool);

    /*** User Interface ***/

    function mint() external payable;

    function redeem(uint256 redeemTokens) external returns (uint256);

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

    function borrow(uint256 borrowAmount) external returns (uint256);

    function repayBorrow() external payable;

    function repayBorrowBehalf(address borrower) external payable;

    function balanceOfUnderlying(address account) external view returns (uint256);

    function borrowBalanceCurrent(address account) external view returns (uint256);
}
