import React, { CSSProperties } from 'react';
import { DamlLedger, useLedger, useParty, useStreamQueries } from '@c7/react';
import { Wallet } from '@daml.js/canton-multisig-wallet-0.1.0/lib/MultiSig/Wallet';
import { TransactionProposal } from '@daml.js/canton-multisig-wallet-0.1.0/lib/MultiSig/TransactionProposal';

// --- Configuration ---
// In a real application, these values would come from a configuration file,
// environment variables, or a login service.
const HTTP_BASE_URL = process.env.REACT_APP_JSON_API_URL || 'http://localhost:7575';
const WEBSOCKET_BASE_URL = process.env.REACT_APP_JSON_API_URL
  ? (process.env.REACT_APP_JSON_API_URL.replace('http', 'ws'))
  : 'ws://localhost:7575';

// You can generate a token for a party using the JSON API. For example, for a party "Alice":
// curl -X POST -u canton:password http://localhost:7575/v1/parties/Alice/token -d "{}"
// Store the generated token in a .env.local file as REACT_APP_ALICE_TOKEN="your-token"
const ALICE_TOKEN = process.env.REACT_APP_ALICE_TOKEN;
const ALICE_PARTY = 'Alice'; // Assuming party display name is 'Alice'

// A simple component to manage user context. In a real app, this would be a more complex login screen.
const UserContext: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!ALICE_TOKEN) {
    return (
      <div style={styles.centeredMessage}>
        <h1>Configuration Missing</h1>
        <p>Please provide a JWT for the user in your environment.</p>
        <p>1. Make sure your sandbox is running: <code>dpm sandbox</code></p>
        <p>2. Create a <code>.env.local</code> file in the <code>frontend</code> directory.</p>
        <p>3. Add the following line to it, replacing `your-token-here` with a valid token:</p>
        <pre><code>REACT_APP_ALICE_TOKEN="your-token-here"</code></pre>
      </div>
    );
  }

  return (
    <DamlLedger token={ALICE_TOKEN} party={ALICE_PARTY} httpBaseUrl={HTTP_BASE_URL} wsBaseUrl={WEBSOCKET_BASE_URL}>
      {children}
    </DamlLedger>
  );
};


// --- Main Application ---
const App: React.FC = () => (
  <UserContext>
    <WalletDashboard />
  </UserContext>
);


// --- Components ---

const WalletDashboard: React.FC = () => {
  const party = useParty();
  const { contracts: wallets, loading: walletsLoading } = useStreamQueries(Wallet);
  const { contracts: proposals, loading: proposalsLoading } = useStreamQueries(TransactionProposal);

  if (walletsLoading || proposalsLoading) {
    return <div style={styles.centeredMessage}>Loading wallets and proposals...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Canton MultiSig Wallet Dashboard</h1>
        <p>Viewing as: <strong>{party}</strong></p>
      </header>
      <main>
        {wallets.length === 0 ? (
          <p style={styles.centeredMessage}>No multi-signature wallets found for your party.</p>
        ) : (
          wallets.map(wallet => (
            <WalletCard
              key={wallet.contractId}
              wallet={wallet.payload}
              proposals={proposals.filter(p => p.payload.walletCid === wallet.contractId)}
            />
          ))
        )}
      </main>
    </div>
  );
};


interface WalletCardProps {
  wallet: Wallet;
  proposals: { contractId: string; payload: TransactionProposal }[];
}

const WalletCard: React.FC<WalletCardProps> = ({ wallet, proposals }) => {
  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Wallet ID: {wallet.id}</h2>
      <div style={styles.walletDetails}>
        <span><strong>Signatories:</strong> {wallet.signatories.join(', ')}</span>
        <span><strong>Required Approvals:</strong> {wallet.requiredApprovals}</span>
      </div>
      <hr style={styles.hr}/>
      <h3>Pending Proposals ({proposals.length})</h3>
      {proposals.length === 0 ? (
        <p>No pending proposals for this wallet.</p>
      ) : (
        proposals.map(proposal => (
          <ProposalCard key={proposal.contractId} proposalCid={proposal.contractId} proposal={proposal.payload} />
        ))
      )}
    </div>
  );
};


interface ProposalCardProps {
  proposalCid: string;
  proposal: TransactionProposal;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposalCid, proposal }) => {
  const ledger = useLedger();
  const party = useParty();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await ledger.exercise(TransactionProposal.Approve, proposalCid, {});
    } catch (error) {
      console.error('Approval failed:', error);
      alert(`Failed to approve transaction: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecute = async () => {
    setIsSubmitting(true);
    try {
      await ledger.exercise(TransactionProposal.Execute, proposalCid, {});
    } catch (error) {
      console.error('Execution failed:', error);
      alert(`Failed to execute transaction: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { wallet, approvers, requiredApprovals } = proposal;
  const isSignatory = wallet.signatories.includes(party);
  const hasApproved = approvers.includes(party);
  const canApprove = isSignatory && !hasApproved;
  const approvalCount = approvers.length;
  const canExecute = approvalCount >= parseInt(requiredApprovals);

  return (
    <div style={styles.proposalCard}>
      <div style={styles.proposalHeader}>
        <h4>Proposal: {proposal.transactionId}</h4>
        <span>Proposer: {proposal.proposer}</span>
      </div>
      <p><strong>Action:</strong> Transfer {proposal.amount} {proposal.currency} to {proposal.targetAccount.id.unpack}</p>
      
      <div style={styles.approvals}>
        <strong>Approvals: {approvalCount} / {requiredApprovals}</strong>
        <ul style={styles.approvalList}>
          {wallet.signatories.map(sig => {
            const approved = approvers.includes(sig);
            return (
              <li key={sig} style={approved ? styles.approved : styles.pending}>
                {sig} {approved ? ' (✓ Approved)' : ' (⌛ Pending)'}
              </li>
            );
          })}
        </ul>
      </div>

      <div style={styles.buttonGroup}>
        {canApprove && (
          <button style={styles.button} onClick={handleApprove} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Approve'}
          </button>
        )}
        {canExecute && (
          <button style={{...styles.button, ...styles.executeButton}} onClick={handleExecute} disabled={isSubmitting}>
            {isSubmitting ? 'Executing...' : `Execute (${approvalCount}/${requiredApprovals})`}
          </button>
        )}
        {!canApprove && hasApproved && <span style={styles.approvedText}>You have approved this proposal.</span>}
      </div>
    </div>
  );
};


// --- Styling ---

const styles: { [key: string]: CSSProperties } = {
  container: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    maxWidth: '1024px',
    margin: '0 auto',
    padding: '2rem',
    color: '#333',
  },
  centeredMessage: {
    textAlign: 'center',
    padding: '4rem',
    color: '#555',
  },
  header: {
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderBottom: '1px solid #dee2e6',
    marginBottom: '2rem',
    borderRadius: '8px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  },
  cardTitle: {
    marginTop: 0,
    borderBottom: '2px solid #f1f3f5',
    paddingBottom: '1rem',
    color: '#0052cc',
  },
  walletDetails: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
    padding: '1rem 0',
  },
  hr: {
    border: 0,
    borderTop: '1px solid #e9ecef',
    margin: '1.5rem 0',
  },
  proposalCard: {
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    padding: '1rem',
    marginTop: '1rem',
    backgroundColor: '#f8f9fa',
  },
  proposalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  approvals: {
    marginTop: '1rem',
  },
  approvalList: {
    listStyleType: 'none',
    paddingLeft: 0,
  },
  approved: {
    color: '#28a745',
  },
  approvedText: {
    color: '#28a745',
    fontWeight: 'bold',
    marginLeft: '1rem'
  },
  pending: {
    color: '#fd7e14',
  },
  buttonGroup: {
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
  },
  button: {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  executeButton: {
    backgroundColor: '#28a745',
  },
};

export default App;