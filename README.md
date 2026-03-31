# Canton Multi-Signature Wallet

This repository contains a multi-signature (multisig) wallet implementation built on the Canton Network using Daml smart contracts. It provides a secure and auditable way to manage shared digital assets or execute critical operations, requiring a predefined number of approvals before any action is taken.

## Project Overview

The `canton-multisig-wallet` project allows for the creation of shared accounts where transactions or operations must be approved by a threshold number of designated parties (signatories) before they can be finalized. This is ideal for decentralized autonomous organizations (DAOs), corporate treasuries, joint ventures, or any scenario demanding collaborative control and enhanced security.

### Key Features

*   **M-of-N Multisig:** Configure a wallet to require `M` approvals out of `N` potential signatories for any proposed action.
*   **Proposal System:** Any signatory can propose a transaction (e.g., "send funds to X", "change a parameter Y").
*   **Approval Mechanism:** Other signatories can review and approve proposed transactions.
*   **Automated Execution:** Once the required `M` approvals are met, the proposed action is automatically executed on the Canton ledger.
*   **Auditability:** All proposals, approvals, and executions are recorded as immutable Daml contracts on the ledger, providing a clear audit trail.
*   **Extensible Operations:** Designed to be flexible, allowing for various types of "payloads" or operations to be proposed and executed, not just asset transfers.

### Use Cases

*   **DAO Treasuries:** Manage community funds with collective governance.
*   **Corporate Bank Accounts:** Require multiple director approvals for large expenditures.
*   **Joint Ventures:** Shared control over project finances or key decisions.
*   **Escrow Services:** Release funds only upon mutual agreement of involved parties.
*   **System Administration:** Securely enact critical configuration changes requiring team consensus.

## Technologies Used

*   **Canton Network:** A privacy-preserving distributed ledger for inter-company workflows.
*   **Daml:** The smart contract language used to define the ledger logic, ensuring strong types, authorization, and atomic transactions.

## Getting Started

To run and test this project, you will need the Daml SDK installed.

### Prerequisites

*   **Daml SDK (version 3.1.0 or newer):** Follow the installation instructions at [daml.com/get-started](https://www.daml.com/get-started/).

### Build the Project

Navigate to the project root directory and run:

```bash
daml build
```

This will compile the Daml contracts into a `.dar` file, which is the deployable artifact for Canton.

### Run Tests

The project includes Daml Script tests to verify the contract logic.

```bash
daml test
```

This command executes the predefined test scenarios, ensuring the multisig logic (proposal, approval, execution) behaves as expected.

## Project Structure

*   `daml/`: Contains the Daml smart contract source files.
    *   `Multisig.daml`: Defines the core multisig wallet template, proposal, and approval mechanisms.
    *   `Payload.daml`: Defines example payload types that the multisig wallet can execute (e.g., simple transfer).
*   `daml.yaml`: Project configuration file for Daml, specifying SDK version, dependencies, and project metadata.
*   `README.md`: This file.
*   `.gitignore`: Specifies files and directories to be ignored by Git.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (Note: A `LICENSE` file would typically be added to a real project).