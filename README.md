# Canton Multi-Signature Wallet

This project provides a Daml implementation of an m-of-n multi-signature wallet on the Canton Network. It allows a group of parties to collectively manage assets, where any transaction requires approval from a minimum number of members (`m`) out of the total `n` members.

This pattern is essential for applications like:
- DAO (Decentralized Autonomous Organization) treasuries
- Corporate expense accounts
- Joint savings accounts
- Escrow services

## Why Canton and Daml?

Daml provides a robust framework for modeling multi-party workflows with built-in authorization and privacy. Canton, as a privacy-enabled distributed ledger platform, ensures that wallet details and transactions are only visible to the involved parties, a critical feature for enterprise and institutional use cases.

- **Privacy by Default:** Canton ensures that only the signatories of a specific wallet can see its state and pending proposals. Unrelated parties on the network have no visibility.
- **Verifiable Execution:** Daml's smart contract logic guarantees that transactions are only executed when the pre-defined signature threshold is met. The rules are code and are enforced by the ledger.
- **Clear Authorization:** The `signatory` and `controller` keywords in Daml make it explicit who can create wallets, propose transactions, and approve them.
- **Interoperability:** Canton's design allows multi-sig wallets to interoperate across different domains and blockchains, enabling complex cross-chain treasury management.

## Core Concepts

The workflow is designed around two primary Daml templates:

1.  **`Wallet`**: This is the main contract representing the shared account.
    -   It holds the list of `signatories` (`n` parties).
    -   It defines the `minSigs` required for any transaction (`m`).
    -   It acts as the authority for creating new transaction proposals.

2.  **`TransactionProposal`**: This contract represents a pending transaction that has been proposed but not yet fully approved.
    -   It contains the `payload` of the transaction (e.g., transfer details).
    -   It tracks the parties who have already `cosigned` the proposal.
    -   Once `minSigs` is reached, the transaction can be executed.

## Workflow

The typical lifecycle of a multi-sig transaction is as follows:

1.  **Wallet Creation**: A group of parties (e.g., Alice, Bob, and Charlie) agree to create a shared wallet. One party creates the `Wallet` contract, specifying all `signatories` and the signature threshold (e.g., 2-of-3). All other parties are signatories on this contract.

2.  **Transaction Proposal**: Any signatory (e.g., Alice) can propose a transaction by exercising the `ProposeTransaction` choice on the `Wallet` contract. This creates a `TransactionProposal` contract, with Alice as the first signatory.

3.  **Co-signing**: The other signatories (Bob and Charlie) are observers on the `TransactionProposal`. They can review the transaction details and, if they agree, exercise the `Cosign` choice to add their signature.

4.  **Execution**: When the number of co-signers reaches the `minSigs` threshold, the `Cosign` choice automatically triggers the final action. For example, if Bob is the second person to sign a 2-of-3 proposal, his `Cosign` action will not only add his signature but also execute the transaction payload.

5.  **Cancellation**: The original proposer can cancel the `TransactionProposal` at any time before it is fully signed and executed by exercising the `CancelProposal` choice.

## How to Get Started

### Prerequisites

-   [Daml SDK v3.1.0](https://docs.daml.com/getting-started/installation)
-   A running Canton environment. A minimal configuration is provided in `canton/canton.conf`.

### Build the Project

Compile the Daml code and create a distributable `.dar` file:

```bash
daml build
```

### Run Tests

Execute the test scenarios defined in `daml/Test.daml`:

```bash
daml test
```

### Run on Canton

1.  **Start the Canton Ledger:**
    Open a terminal and run the Canton console from the project root.

    ```bash
    canton -c canton/canton.conf --bootstrap canton/bootstrap.canton
    ```
    This script will start a participant node, connect it to a mediator and domain, and allocate the necessary parties (`Operator`, `Alice`, `Bob`, `Charlie`).

2.  **Deploy the DAR file:**
    In the Canton console (`canton>`), deploy the compiled DAR file to the participant node (`p1`).

    ```csharp
    p1.dars.upload(r".daml/dist/canton-multisig-wallet-0.1.0.dar")
    ```

3.  **Run the Setup Script:**
    In a new terminal, run the `Daml.Script` to initialize the contracts on the ledger. This will create a 2-of-3 wallet for Alice, Bob, and Charlie.

    ```bash
    daml script \
      --dar .daml/dist/canton-multisig-wallet-0.1.0.dar \
      --script-name Main:setup \
      --ledger-host localhost \
      --ledger-port 10011 # Default port for participant p1
    ```

You can now interact with the wallet by proposing and co-signing transactions via Daml Script or the JSON API.