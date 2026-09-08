import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Package,
  Plus,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Check,
  ExternalLink,
  Gamepad2,
  AlertCircle,
  Edit3,
  Bot,
  Copy,
} from 'lucide-react';
import { User, PlayerPetItem } from '../types';
import { RobuxIcon } from './RobuxIcon';
import { sounds } from '../utils/audio';
import {
  getPlayerPets,
  removePetFromPlayer,
  removePetsFromPlayer,
  getDiscordServerLink,
  setDiscordServerLink,
  isUserAdmin,
} from '../utils/auth';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenCreateWithPets: () => void;
  onInventoryChanged?: () => void;
}

type SortOption = 'value-desc' | 'value-asc' | 'name-asc';
type InventoryViewMode = 'inventory' | 'withdraw' | 'withdraw-confirmed' | 'deposit';

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onInventoryChanged,
}) => {
  const [pets, setPets] = useState<PlayerPetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('value-desc');
  const [viewMode, setViewMode] = useState<InventoryViewMode>('inventory');

  // Withdraw selection state
  const [selectedWithdrawIds, setSelectedWithdrawIds] = useState<string[]>([]);
  const [withdrawnSummary, setWithdrawnSummary] = useState<{ count: number; value: number } | null>(null);

  // Admin Discord server link editing state
  const [discordLink, setDiscordLink] = useState(getDiscordServerLink());
  const [isEditingDiscord, setIsEditingDiscord] = useState(false);
  const [editDiscordInput, setEditDiscordInput] = useState(discordLink);
  const [discordSaveSuccess, setDiscordSaveSuccess] = useState(false);
  const [copiedBot, setCopiedBot] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setPets(getPlayerPets(currentUser.username));
      setViewMode('inventory');
      setSelectedWithdrawIds([]);
      setDiscordLink(getDiscordServerLink());
      setEditDiscordInput(getDiscordServerLink());
      setIsEditingDiscord(false);
    }
  }, [isOpen, currentUser]);

  const totalValue = useMemo(() => {
    return pets.reduce((sum, p) => sum + p.valueInRobux, 0);
  }, [pets]);

  const selectedWithdrawValue = useMemo(() => {
    const idSet = new Set(selectedWithdrawIds);
    return pets.filter((p) => idSet.has(p.id)).reduce((sum, p) => sum + p.valueInRobux, 0);
  }, [pets, selectedWithdrawIds]);

  const filteredPets = useMemo(() => {
    return pets
      .filter((pet) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return pet.name.toLowerCase().includes(q) || (pet.rarity && pet.rarity.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sortOption === 'value-desc') {
          return b.valueInRobux - a.valueInRobux;
        }
        if (sortOption === 'value-asc') {
          return a.valueInRobux - b.valueInRobux;
        }
        if (sortOption === 'name-asc') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [pets, searchQuery, sortOption]);

  if (!isOpen || !currentUser) return null;

  const isAdmin = isUserAdmin(currentUser.username) || (currentUser as any).isAdmin;

  const handleRemove = (petId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playClick();
    removePetFromPlayer(currentUser.username, petId);
    setPets((prev) => prev.filter((p) => p.id !== petId));
    if (onInventoryChanged) onInventoryChanged();
  };

  const handleToggleSelectPet = (petId: string) => {
    sounds.playClick();
    setSelectedWithdrawIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
    );
  };

  const handleSelectAllWithdraw = () => {
    sounds.playClick();
    if (selectedWithdrawIds.length === filteredPets.length) {
      setSelectedWithdrawIds([]);
    } else {
      setSelectedWithdrawIds(filteredPets.map((p) => p.id));
    }
  };

  const handleConfirmWithdrawal = () => {
    if (selectedWithdrawIds.length === 0) return;
    sounds.playWinChime();

    const count = selectedWithdrawIds.length;
    const value = selectedWithdrawValue;
    setWithdrawnSummary({ count, value });

    // Deduct pets from player's inventory
    removePetsFromPlayer(currentUser.username, selectedWithdrawIds);
    setPets(getPlayerPets(currentUser.username));
    if (onInventoryChanged) onInventoryChanged();

    // Open Discord Server in a new tab
    const currentDiscord = getDiscordServerLink();
    try {
      window.open(currentDiscord, '_blank');
    } catch {
      // ignore
    }

    setViewMode('withdraw-confirmed');
  };

  const handleSaveDiscordLink = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playCoinLand();
    const updated = setDiscordServerLink(editDiscordInput);
    setDiscordLink(updated);
    setDiscordSaveSuccess(true);
    setTimeout(() => {
      setDiscordSaveSuccess(false);
      setIsEditingDiscord(false);
    }, 1800);
  };

  const handleCopyBot = () => {
    sounds.playClick();
    navigator.clipboard?.writeText('AdoptLuck_TradeBot1');
    setCopiedBot(true);
    setTimeout(() => setCopiedBot(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      id="inventory-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="inventory-modal-content"
        className="w-full max-w-4xl bg-[#0e1420] border border-[#1b2538] rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* TOP HEADER: Clean display as requested: "only show Inventory and the total value" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#00E701] flex items-center justify-center shadow-inner shrink-0">
              <Package className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              {viewMode === 'withdraw' ? (
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Withdraw Pets
                  </h3>
                  <p className="text-xs text-amber-400 font-medium mt-0.5">
                    Choose the pets you want to withdraw
                  </p>
                </div>
              ) : viewMode === 'deposit' ? (
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Deposit Pets
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trade our bot to credit your AdoptLuck inventory
                  </p>
                </div>
              ) : viewMode === 'withdraw-confirmed' ? (
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Withdrawal Confirmed
                  </h3>
                  <p className="text-xs text-emerald-400 mt-0.5">
                    Redirecting to Discord trade tickets
                  </p>
                </div>
              ) : (
                /* Purely "Inventory" and "Total Value" as strictly requested */
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight" id="inventory-modal-title">
                    Inventory
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5" id="inventory-total-value">
                    Total Value:
                    <span className="inline-flex items-center gap-1 font-mono font-black text-[#00E701]">
                      <RobuxIcon className="w-3.5 h-3.5 text-[#00E701]" />
                      {totalValue.toLocaleString()}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top Right Action Buttons: Deposit & Withdraw */}
          {viewMode === 'inventory' && (
            <div className="flex items-center gap-2.5">
              {/* Deposit Button */}
              <button
                id="inventory-deposit-btn"
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setViewMode('deposit');
                }}
                className="px-4 py-2.5 bg-[#12221b] hover:bg-[#162d24] border border-emerald-500/40 text-[#00E701] hover:text-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                title="Deposit Adopt Me pets"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Deposit</span>
              </button>

              {/* Withdraw Button */}
              <button
                id="inventory-withdraw-btn"
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSelectedWithdrawIds([]);
                  setViewMode('withdraw');
                }}
                className="px-4 py-2.5 bg-[#00E701] hover:bg-[#00c701] text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(0,231,1,0.3)] active:scale-95"
                title="Choose pets to withdraw"
              >
                <ArrowUpFromLine className="w-4 h-4 stroke-[2.5]" />
                <span>Withdraw</span>
              </button>
            </div>
          )}

          {viewMode === 'withdraw' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllWithdraw}
                className="px-3 py-2 bg-[#141e30] hover:bg-[#1c2940] border border-[#202f4a] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {selectedWithdrawIds.length === filteredPets.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setViewMode('inventory');
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* VIEW 1 & 2: INVENTORY BROWSE / WITHDRAW SELECTION VIEW */}
        {(viewMode === 'inventory' || viewMode === 'withdraw') && (
          <>
            {/* Search and Sort Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#182337]">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pets by name..."
                  className="w-full pl-9 pr-8 py-2 bg-[#090d16] border border-[#1a253a] rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#090d16] border border-[#1a253a] px-3 py-2 rounded-xl text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="value-desc" className="bg-[#0e1420] text-white">Value: High to Low</option>
                    <option value="value-asc" className="bg-[#0e1420] text-white">Value: Low to High</option>
                    <option value="name-asc" className="bg-[#0e1420] text-white">Name: A to Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PETS GRID: Real Adopt Me Pets with AMVGG values (all >= 1 value / >= 1000 Robux) */}
            <div className="flex-1 overflow-y-auto pr-1" id="inventory-pets-container">
              {filteredPets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {filteredPets.map((pet) => {
                    const numericId = pet.petId?.replace(/\D/g, '') || '1';
                    const imageSrc = pet.imageUrl || `/api/amvgg/image/${numericId}`;
                    const fallbackUrl = `https://adoptmevalues.gg/api/adoptme/item-image/${numericId}`;
                    const isSelected = selectedWithdrawIds.includes(pet.id);

                    return (
                      <div
                        key={pet.id}
                        id={`inventory-pet-${pet.id}`}
                        onClick={() => {
                          if (viewMode === 'withdraw') {
                            handleToggleSelectPet(pet.id);
                          }
                        }}
                        className={`bg-[#0d131d] rounded-2xl p-3 flex flex-col justify-between transition-all group relative cursor-pointer ${
                          viewMode === 'withdraw'
                            ? isSelected
                              ? 'border-2 border-[#00E701] shadow-[0_0_15px_rgba(0,231,1,0.25)] bg-[#0d1822]'
                              : 'border border-[#192439] hover:border-slate-500'
                            : 'border border-[#192439] hover:border-emerald-500/40 hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)]'
                        }`}
                      >
                        {/* Withdraw Mode Selection Badge */}
                        {viewMode === 'withdraw' ? (
                          <div
                            className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#00E701] text-black shadow-md'
                                : 'bg-[#0a0f18] border border-slate-700 text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : (
                          /* Remove button in browse mode */
                          <button
                            type="button"
                            onClick={(e) => handleRemove(pet.id, e)}
                            className="absolute top-2 right-2 z-10 p-1.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg bg-[#0d1422]/90 border border-slate-700/50"
                            title="Remove from inventory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Pet Image */}
                        <div className="relative w-full aspect-square bg-[#080c14] rounded-xl border border-[#162032] flex items-center justify-center p-2.5 mb-2.5 overflow-hidden">
                          <img
                            src={imageSrc}
                            alt={pet.name}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = fallbackUrl;
                            }}
                            className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)] group-hover:scale-108 transition-transform duration-300"
                          />
                        </div>

                        {/* Pet Name & Market Value */}
                        <div className="w-full">
                          <h4
                            className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate mb-1"
                            title={pet.name}
                          >
                            {pet.name}
                          </h4>

                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-black text-white font-mono">
                              <RobuxIcon className="w-3.5 h-3.5 text-[#00E701] flex-shrink-0" />
                              <span className="text-[#00E701] font-bold">
                                {pet.valueInRobux.toLocaleString()}
                              </span>
                            </div>
                            {pet.rarity && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-[#141d2c] border border-slate-700/50 px-1.5 py-0.5 rounded truncate">
                                {pet.rarity}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white">
                    {searchQuery ? 'No pets match your search' : 'No pets in your inventory'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'Try searching with a different pet name or clear your search query.'
                      : 'Click Deposit above to trade our official bot or join Discord to deposit pets!'}
                  </p>
                  {!searchQuery && (
                    <button
                      type="button"
                      onClick={() => setViewMode('deposit')}
                      className="mt-4 px-5 py-2.5 bg-[#00E701] hover:bg-[#00c701] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Deposit Pets
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* WITHDRAW ACTION STICKY BOTTOM BAR */}
            {viewMode === 'withdraw' && (
              <div className="mt-4 pt-3 border-t border-[#182337] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0a0e17] p-3.5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    Selected:{' '}
                    <strong className="text-white font-mono">{selectedWithdrawIds.length}</strong>{' '}
                    pets
                  </span>
                  <span className="text-slate-600">|</span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>Withdrawal Value:</span>
                    <RobuxIcon className="w-3.5 h-3.5 text-[#00E701]" />
                    <span className="font-mono font-black text-[#00E701]">
                      {selectedWithdrawValue.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setViewMode('inventory')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-withdrawal-btn"
                    type="button"
                    disabled={selectedWithdrawIds.length === 0}
                    onClick={handleConfirmWithdrawal}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                      selectedWithdrawIds.length > 0
                        ? 'bg-[#00E701] hover:bg-[#00c701] text-black shadow-[0_0_15px_rgba(0,231,1,0.3)] active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Withdrawal ({selectedWithdrawIds.length})</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* VIEW 3: WITHDRAWAL CONFIRMED OVERLAY */}
        {viewMode === 'withdraw-confirmed' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-[#00E701] text-[#00E701] flex items-center justify-center shadow-[0_0_30px_rgba(0,231,1,0.3)] mb-4 animate-bounce">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight mb-1">
              Withdrawal Confirmed!
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto mb-4">
              Your withdrawal for{' '}
              <strong className="text-white font-mono">{withdrawnSummary?.count} pets</strong>{' '}
              (Total Value:{' '}
              <span className="text-[#00E701] font-mono font-black">
                {withdrawnSummary?.value.toLocaleString()} R$
              </span>
              ) has been confirmed and deducted from your inventory.
            </p>

            <div className="p-4 bg-[#0a0f18] border border-[#192439] rounded-2xl max-w-md w-full mb-5 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#5865F2] font-black uppercase tracking-wider text-[11px]">
                <Gamepad2 className="w-4 h-4" />
                <span>Next Step: Collect via Discord Trade Bot</span>
              </div>
              <p className="text-slate-400">
                You have been redirected to our Discord server. Open a ticket in <strong>#withdraw-tickets</strong> or DM our automated trade bot with your Roblox username to receive your pets in Adopt Me!
              </p>
            </div>

            {/* Direct Discord Link Button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <a
                href={discordLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Open Discord Server</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <button
                type="button"
                onClick={() => setViewMode('inventory')}
                className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                Back to Inventory
              </button>
            </div>

            {/* Admin Discord link editor permission */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-[#182337] w-full max-w-md text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    Admin Permission: Edit Discord Link
                  </span>
                  {!isEditingDiscord && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDiscord(true)}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Change Link
                    </button>
                  )}
                </div>

                {isEditingDiscord && (
                  <form onSubmit={handleSaveDiscordLink} className="space-y-2 mt-2">
                    <input
                      type="url"
                      value={editDiscordInput}
                      onChange={(e) => setEditDiscordInput(e.target.value)}
                      placeholder="https://discord.gg/your-server"
                      className="w-full px-3 py-2 bg-[#090d16] border border-amber-500/40 rounded-xl text-xs font-mono text-white focus:outline-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingDiscord(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase"
                      >
                        Save Link
                      </button>
                    </div>
                  </form>
                )}

                {discordSaveSuccess && (
                  <span className="text-xs text-emerald-400 font-bold block mt-1">
                    ✓ Discord link saved successfully!
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: DEPOSIT VIEW */}
        {viewMode === 'deposit' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto py-2 pr-1">
            <div className="space-y-4">
              <div className="bg-[#0b101b] border border-[#1a253a] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#182337]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#00E701] flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Official Trade Bot</h4>
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#00E701] animate-pulse" />
                        Online & Ready to Trade
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-[#090d16] border border-slate-700 text-xs font-mono font-bold text-white">
                      AdoptLuck_TradeBot1
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyBot}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy bot username"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {copiedBot && <span className="text-xs text-emerald-400 font-bold">Copied!</span>}
                  </div>
                </div>

                {/* Steps to Deposit */}
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#00E701] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Join our trade bot in <strong>Roblox Adopt Me</strong> or request a direct trade link via our Discord server.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#00E701] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Send a trade request to <strong>AdoptLuck_TradeBot1</strong> and add the pets you wish to deposit.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#00E701] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Accept the trade. Our system automatically calculates real <strong>Adopt Me Values GG</strong> rates and immediately credits your inventory!
                    </p>
                  </div>
                </div>
              </div>

              {/* Discord Support Card */}
              <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5865F2] text-white flex items-center justify-center shrink-0">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Need Fast Deposit Assistance?</h4>
                    <p className="text-xs text-slate-400">
                      Join our Discord to open a deposit ticket and trade staff directly.
                    </p>
                  </div>
                </div>

                <a
                  href={discordLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Join Discord</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Admin Discord Link Editor */}
              {isAdmin && (
                <div className="bg-[#0e1422] border border-amber-500/30 rounded-2xl p-4 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" />
                      Admin Configuration: Discord Server Link
                    </span>
                    {!isEditingDiscord && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDiscord(true)}
                        className="text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Edit URL
                      </button>
                    )}
                  </div>

                  {isEditingDiscord ? (
                    <form onSubmit={handleSaveDiscordLink} className="space-y-2 mt-2">
                      <input
                        type="url"
                        value={editDiscordInput}
                        onChange={(e) => setEditDiscordInput(e.target.value)}
                        placeholder="https://discord.gg/your-server"
                        className="w-full px-3 py-2 bg-[#090d16] border border-amber-500/40 rounded-xl font-mono text-white text-xs focus:outline-none"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingDiscord(false)}
                          className="px-3 py-1 text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-slate-400 font-mono text-[11px] truncate">
                      Current: {discordLink}
                    </p>
                  )}

                  {discordSaveSuccess && (
                    <span className="text-emerald-400 font-bold block mt-1">
                      ✓ Discord link saved!
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#182337] flex justify-end">
              <button
                type="button"
                onClick={() => setViewMode('inventory')}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Back to Inventory
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
