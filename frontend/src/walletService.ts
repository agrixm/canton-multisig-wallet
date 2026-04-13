// src/walletService.ts

/**
 * Interfaces for Daml contract data structures to provide type safety in TypeScript.
 * These should mirror the definitions in the corresponding Daml models.
 */

/**
 * Represents an active MultiSigWallet contract on the ledger.
 */
export interface Wallet {
  id: string;
  owner: string;
  signatories: string[];
  requiredApprovals: number;
}

/**
 * Represents the payload of a command to be executed by the wallet.
 * This generic structure allows proposing any valid Daml choice on any contract.
 */
export interface CommandPayload {
  // The contract ID of the contract on which the choice will be exercised.
  targetContractId: string;
  // The name of the choice to be exercised.
  choiceName: string;
  // The argument for the choice. Its structure must match the Daml choice definition.
  choiceArgument: any;
}

/**
 * Represents an active TransactionProposal contract on the ledger.
 */
export interface Proposal {
  contractId: string;
  walletCid: string;
  proposer: string;
  payload: CommandPayload;
  approvals: string[];
}

/**
 * Represents an active Approval contract on the ledger, signifying a co-signature.
 */
export interface Approval {
  contractId: string;
  proposalCid: string;
  approver: string;
}

// Standardized template identifiers used for ledger interactions.
// Assumes a Daml module structure like `daml/MultiSigWallet/Wallet.daml`, etc.
const TEMPLATE_IDS = {
  WALLET: "MultiSigWallet.Wallet:MultiSigWallet",
  PROPOSAL: "MultiSigWallet.Proposal:TransactionProposal",
  APPROVAL: "MultiSigWallet.Approval:Approval",
};

/**
 * A service class to encapsulate all interactions with the Canton Ledger's JSON API
 * for the multi-signature wallet application.
 */
class WalletApiService {
  private readonly ledgerUrl: string;

  constructor(ledgerUrl: string) {
    this.ledgerUrl = ledgerUrl;
    console.log(`WalletApiService initialized for ledger at: ${this.ledgerUrl}`);
  }

  /**
   * A generic helper function to send authenticated requests to the JSON API.
   * @param path The API endpoint path (e.g., /v1/query).
   * @param token The JWT for the party acting.
   * @param body The JSON body of the request.
   * @returns The `result` field from the API response.
   */
  private async apiFetch(path: string, token: string, body: object): Promise<any> {
    const url = `${this.ledgerUrl}${path}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const jsonResponse = await response.json();
      if (jsonResponse.status !== 200) {
        // This indicates a ledger-level error (e.g., contract not found, choice failed).
        throw new Error(`Ledger operation failed: ${JSON.stringify(jsonResponse.errors)}`);
      }

      return jsonResponse.result;

    } catch (error) {
      console.error(`Error during API call to ${url}:`, error);
      throw error;
    }
  }

  // ===================================================================================
  // Query Methods - Fetching active contracts from the ledger
  // ===================================================================================

  /**
   * Fetches all MultiSigWallet contracts visible to the party associated with the token.
   */
  async getWallets(token: string): Promise<Wallet[]> {
    const query = { templateIds: [TEMPLATE_IDS.WALLET] };
    const contracts = await this.apiFetch("/v1/query", token, query);
    return contracts.map((c: any) => ({
      id: c.contractId,
      ...c.payload,
    }));
  }

  /**
   * Fetches all TransactionProposal contracts, optionally filtering by wallet.
   * @param walletCid - If provided, filters proposals for a specific wallet.
   */
  async getProposals(token: string, walletCid?: string): Promise<Proposal[]> {
    const query = { templateIds: [TEMPLATE_IDS.PROPOSAL] };
    const contracts = await this.apiFetch("/v1/query", token, query);

    const proposals = contracts.map((c: any) => ({
      contractId: c.contractId,
      ...c.payload,
    }));

    // The JSON API /v1/query doesn't support filtering on payload fields.
    // We fetch all visible proposals and filter on the client side.
    if (walletCid) {
        return proposals.filter((p: Proposal) => p.walletCid === walletCid);
    }
    return proposals;
  }

  // ===================================================================================
  // Command Methods - Creating contracts and exercising choices
  // ===================================================================================

  /**
   * Exercises the `ProposeTransaction` choice on a `MultiSigWallet` contract.
   * @param walletCid The contract ID of the wallet to propose on.
   * @param token The proposer's JWT.
   * @param payload The command payload describing the transaction to be executed.
   */
  async createProposal(
    walletCid: string,
    token: string,
    payload: CommandPayload
  ): Promise<any> {
    const command = {
      templateId: TEMPLATE_IDS.WALLET,
      contractId: walletCid,
      choice: "ProposeTransaction",
      argument: {
        payload: payload,
      },
    };
    return this.apiFetch("/v1/exercise", token, command);
  }

  /**
   * Exercises the `Approve` choice on a `TransactionProposal` contract.
   * @param proposalCid The contract ID of the proposal to approve.
   * @param token The approver's JWT.
   */
  async approveProposal(proposalCid: string, token: string): Promise<any> {
    const command = {
      templateId: TEMPLATE_IDS.PROPOSAL,
      contractId: proposalCid,
      choice: "Approve",
      argument: {},
    };
    return this.apiFetch("/v1/exercise", token, command);
  }

  /**
   * Exercises the `Execute` choice on a `TransactionProposal` contract,
   * which will run the proposed command if the approval threshold is met.
   * @param proposalCid The contract ID of the proposal to execute.
   * @param token The executor's JWT.
   */
  async executeProposal(proposalCid: string, token: string): Promise<any> {
    const command = {
      templateId: TEMPLATE_IDS.PROPOSAL,
      contractId: proposalCid,
      choice: "Execute",
      argument: {},
    };
    return this.apiFetch("/v1/exercise", token, command);
  }

  /**
   * Creates a new `MultiSigWallet` contract on the ledger.
   * @param owner The managing party of the wallet.
   * @param signatories The list of parties who can sign transactions.
   * @param requiredApprovals The m-of-n threshold.
   * @param token The owner's JWT.
   */
  async createWallet(
    owner: string,
    signatories: string[],
    requiredApprovals: number,
    token: string
  ): Promise<any> {
    const command = {
      templateId: TEMPLATE_IDS.WALLET,
      payload: {
        owner,
        signatories,
        requiredApprovals,
      },
    };
    return this.apiFetch("/v1/create", token, command);
  }
}

// Export a singleton instance of the service.
// The ledger URL can be configured via environment variables,
// falling back to the default Canton sandbox port.
const ledgerUrl = process.env.REACT_APP_LEDGER_URL || 'http://localhost:7575';
export const walletService = new WalletApiService(ledgerUrl);