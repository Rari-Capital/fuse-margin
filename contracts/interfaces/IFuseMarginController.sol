// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.6;

interface IFuseMarginController {
    /// @dev Emitted when support of FuseMargin contract is added
    /// @param contractAddress Address of FuseMargin contract added
    /// @param owner User who added the contract
    event AddMarginContract(address indexed contractAddress, address owner);

    /// @dev Emitted when support of FuseMargin contract is removed
    /// @param contractAddress Address of FuseMargin contract removed
    /// @param owner User who removed the contract
    event RemoveMarginContract(address indexed contractAddress, address owner);

    /// @dev Creates a position NFT, to be called only from FuseMargin
    /// @param user User to give the NFT to
    /// @param position The position address
    /// @return tokenId of the position
    function newPosition(address user, address position) external returns (uint256);

    /// @dev Burns the position at the index, to be called only from FuseMargin
    /// @param tokenId tokenId of position to close
    function closePosition(uint256 tokenId) external;

    /// @dev Adds support for a new FuseMargin contract, to be called only from owner
    /// @param contractAddress Address of FuseMargin contract
    function addMarginContract(address contractAddress) external;

    /// @dev Removes support for a new FuseMargin contract, to be called only from owner
    /// @param contractAddress Address of FuseMargin contract
    function removeMarginContract(address contractAddress) external;

    /// @dev Gets all approved margin contracts
    /// @return List of the addresses of the approved margin contracts
    function getMarginContracts() external view returns (address[] memory);

    /// @dev Gets all tokenIds and positions a user holds, dont call this on chain since it is expensive
    /// @param user Address of user
    /// @return List of tokenIds the user holds
    /// @return List of positions the user holds
    function tokensOfOwner(address user) external view returns (uint256[] memory, address[] memory);

    /// @dev Gets a position address given an index (index = tokenId)
    /// @param tokenId Index of position
    /// @return position address
    function positions(uint256 tokenId) external view returns (address);

    /// @dev List of supported FuseMargin contracts
    /// @param index Get FuseMargin contract at index
    /// @return FuseMargin contract address
    function marginContracts(uint256 index) external view returns (address);

    /// @dev Check if FuseMargin contract address is approved
    /// @param contractAddress Address of FuseMargin contract
    /// @return true if approved, false if not
    function approvedContracts(address contractAddress) external view returns (bool);
}
