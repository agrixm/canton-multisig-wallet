# Canton Multisig Wallet

This project implements a multi-signature (multisig) wallet on the Canton network using Daml smart contracts. It allows a group of parties to collectively manage a digital treasury or account, requiring a predefined number of approvals before any transaction can be executed.

## Overview

A multisig wallet enhances security by distributing control over funds. Instead of a single private key controlling the assets, multiple keys are required to authorize a transaction. This significantly reduces the risk of unauthorized access due to a single key compromise.

This implementation on Canton leverages the network's privacy and interoperability features to provide a secure and auditable multisig solution. Key features include:

*   **m-of-n Approval:**  The wallet requires `m` signatures out of a total of `n` possible signatories to authorize a transaction. This threshold is configurable at wallet creation.
*   **Transaction Proposals:**  Any signatory can propose a transaction, specifying the recipient and amount.
*   **Co-signing:** Other signatories can review the proposed transaction and co-sign it.
*   **Execution:** Once the required number of signatures (`m`) is reached, the transaction is automatically executed.
*   **Auditability:** All transaction proposals, signatures, and executions are recorded on the Canton ledger, providing a transparent and auditable history.
*   **Daml Smart Contracts:** Implemented using Daml, ensuring correctness and security through formal verification.

## Use Cases

This multisig wallet can be used in various scenarios:

*   **DAO Treasuries:**  Decentralized Autonomous Organizations (DAOs) can use multisig wallets to manage their funds securely, requiring a quorum of members to approve spending.
*   **Corporate Accounts:**  Companies can use multisig wallets for corporate accounts, requiring multiple executives to authorize large transactions.
*   **Escrow Services:**  Multisig wallets can be used in escrow scenarios, where funds are held until certain conditions are met, requiring both the buyer and seller to approve the release of funds.
*   **Custodial Services:**  Securely manage digital assets requiring multiple levels of authorization.

## Contracts

The core contracts that govern the multisig wallet are:

*   `MultisigWallet`: Represents the multisig wallet itself, defining the signatories, required approvals, and current balance.
*   `TransactionProposal`: Represents a proposed transaction, including the recipient, amount, and signatures received.
*   `SignatoryRole`: Establishes the right of a party to act as a signatory to the MultisigWallet.

## Getting Started

See the `docs/` directory for more detailed documentation, including setup instructions and example usage.

## Contributing

Contributions are welcome! Please submit pull requests with bug fixes, new features, or improvements to the documentation.