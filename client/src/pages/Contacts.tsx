import { useState, useEffect } from 'react';
import { Plus, ChevronDown, MessageSquare } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ContactModal } from '../components/ContactModal.tsx';
import { InteractionModal } from '../components/InteractionModal.tsx';
import api from '../services/api.ts';
import type { Contact, Interaction, InteractionType } from '../types/index.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

const INTERACTION_LABELS: Record<InteractionType, string> = {
  email: 'Email',
  phone: 'Phone call',
  coffee_chat: 'Coffee chat',
  linkedin_message: 'LinkedIn message',
  interview: 'Interview',
  referral: 'Referral',
  other: 'Other',
};

const INTERACTION_COLORS: Record<InteractionType, string> = {
  email: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  phone: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  coffee_chat: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  linkedin_message: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  interview: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  referral: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<Record<string, Interaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingInteractions, setLoadingInteractions] = useState<Record<string, boolean>>({});

  // Modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionContactId, setInteractionContactId] = useState<string | null>(null);
  const [interactionContactName, setInteractionContactName] = useState<string | null>(null);

  // Fetch contacts
  useEffect(() => {
    api.get('/contacts')
      .then((res) => setContacts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch interactions for a specific contact
  async function loadInteractions(contactId: string) {
    if (interactions[contactId]) {
      return; // Already loaded
    }
    setLoadingInteractions((prev) => ({ ...prev, [contactId]: true }));
    try {
      const res = await api.get(`/contacts/${contactId}/interactions`);
      setInteractions((prev) => ({ ...prev, [contactId]: res.data }));
    } catch (err) {
      console.error('Failed to load interactions:', err);
    } finally {
      setLoadingInteractions((prev) => ({ ...prev, [contactId]: false }));
    }
  }

  // Toggle contact expansion
  async function toggleContact(contactId: string) {
    if (expandedContactId === contactId) {
      setExpandedContactId(null);
    } else {
      setExpandedContactId(contactId);
      await loadInteractions(contactId);
    }
  }

  // Open interaction modal
  function openInteractionModal(contactId: string, contactName: string) {
    setInteractionContactId(contactId);
    setInteractionContactName(contactName);
    setShowInteractionModal(true);
  }

  // Handle new contact saved
  function handleContactSaved(newContact: Contact) {
    setContacts((prev) => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));
    setShowContactModal(false);
  }

  // Handle new interaction saved
  function handleInteractionSaved(newInteraction: Interaction) {
    if (!interactionContactId) return;
    setInteractions((prev) => ({
      ...prev,
      [interactionContactId]: [...(prev[interactionContactId] || []), newInteraction],
    }));
    setShowInteractionModal(false);
    setInteractionContactId(null);
    setInteractionContactName(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="mt-1 text-sm text-gray-500">Your networking CRM</p>
        </div>
        <button
          onClick={() => setShowContactModal(true)}
          className="btn-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add contact
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))
        ) : contacts.length === 0 ? (
          <div className="card py-12 text-center text-sm text-gray-500">
            No contacts yet. Add people you've connected with at companies you're applying to.
          </div>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="space-y-2">
              {/* Contact card */}
              <div
                className="card flex items-center justify-between py-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => toggleContact(contact.id)}
              >
                <div className="flex-1">
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-500">
                    {contact.role && `${contact.role} at `}
                    {contact.company_name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-gray-500">
                    {contact.last_interaction
                      ? `Last contact ${formatDistanceToNow(new Date(contact.last_interaction), { addSuffix: true })}`
                      : 'No interactions yet'}
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedContactId === contact.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded details */}
              {expandedContactId === contact.id && (
                <div className="pl-4 space-y-3 pr-4 pb-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  {/* Contact info */}
                  <div className="space-y-2 text-sm">
                    {contact.email && (
                      <p>
                        <span className="font-medium">Email:</span>{' '}
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.email}
                        </a>
                      </p>
                    )}
                    {contact.linkedin_url && (
                      <p>
                        <span className="font-medium">LinkedIn:</span>{' '}
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View profile
                        </a>
                      </p>
                    )}
                    {contact.notes && (
                      <p>
                        <span className="font-medium">Notes:</span> {contact.notes}
                      </p>
                    )}
                  </div>

                  {/* Log interaction button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openInteractionModal(contact.id, contact.name);
                    }}
                    className="btn-secondary text-sm"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Log interaction
                  </button>

                  {/* Interactions list */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Interaction history</h4>
                    {loadingInteractions[contact.id] ? (
                      <p className="text-sm text-gray-400">Loading interactions…</p>
                    ) : interactions[contact.id] && interactions[contact.id].length > 0 ? (
                      <div className="space-y-2">
                        {interactions[contact.id].map((interaction) => (
                          <div
                            key={interaction.id}
                            className="bg-white dark:bg-gray-700 rounded-lg p-2 space-y-1"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  INTERACTION_COLORS[interaction.interaction_type]
                                }`}
                              >
                                {INTERACTION_LABELS[interaction.interaction_type]}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(interaction.interaction_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            {interaction.notes && (
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                {interaction.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No interactions yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal
          onClose={() => setShowContactModal(false)}
          onSaved={handleContactSaved}
        />
      )}

      {/* Interaction Modal */}
      {showInteractionModal && interactionContactId && interactionContactName && (
        <InteractionModal
          contactId={interactionContactId}
          contactName={interactionContactName}
          onClose={() => {
            setShowInteractionModal(false);
            setInteractionContactId(null);
            setInteractionContactName(null);
          }}
          onSaved={handleInteractionSaved}
        />
      )}
    </div>
  );
}
