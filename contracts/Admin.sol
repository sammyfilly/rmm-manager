// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.0;

import "./interfaces/IAdmin.sol";

contract Admin is IAdmin {
    /// @inheritdoc IAdmin
    address public override admin;

    /// @dev Restrict the call to the admin
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    /// @param _admin The address receiving the admin rights
    constructor(address _admin) {
        admin = _admin;
    }

    /// @inheritdoc IAdmin
    function setAdmin(address newAdmin) external override onlyAdmin() {
        emit AdminSet(admin, newAdmin);
        admin = newAdmin;
    }
}
