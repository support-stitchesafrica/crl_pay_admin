import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw } from 'lucide-react';
import { Button, Input, NumberInput } from '../components/ui';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';

interface CreditTierThresholds {
  bronze: { min: number; max: number };
  silver: { min: number; max: number };
  gold: { min: number; max: number };
  platinum: { min: number; max: number };
}

interface ApprovalThresholds {
  instantApproval: { minScore: number; maxRiskFlags: number };
  conditionalApproval: { minScore: number; maxScore: number; maxRiskFlags: number };
  manualReview: { minScore: number; maxScore: number };
  autoDecline: { maxScore: number };
}

interface InterestRates {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

interface AutoDeclineRules {
  maxDefaultedLoans: number;
  maxActiveLoans: number;
  minCreditScore: number;
  blacklistedCustomer: boolean;
  suspendedCustomer: boolean;
}

interface ScoringWeights {
  identity: number;
  behavioral: number;
  financial: number;
  merchant: number;
  history: number;
}

interface CreditConfiguration {
  configId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  creditTiers: CreditTierThresholds;
  approvalThresholds: ApprovalThresholds;
  interestRates: InterestRates;
  autoDeclineRules: AutoDeclineRules;
  scoringWeights: ScoringWeights;
  financierId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export default function CreditConfig() {
  const [configs, setConfigs] = useState<CreditConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CreditConfiguration | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/credit-config');
      setConfigs(response.data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await api.delete(`/credit-config/${configId}`);
      await fetchConfigs();
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleClearCache = async () => {
    try {
      await api.post('/credit-config/cache/clear-cache');
      alert('Cache cleared successfully');
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit Configuration</h1>
          <p className="text-gray-600 mt-1">Manage credit scoring rules and approval thresholds</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClearCache}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Clear Cache
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            New Configuration
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading configurations...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {configs.map((config) => (
            <ConfigCard
              key={config.configId}
              config={config}
              onEdit={setEditingConfig}
              onDelete={handleDelete}
            />
          ))}

          {configs.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No configurations found. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {(showCreateModal || editingConfig) && (
        <ConfigModal
          config={editingConfig}
          onClose={() => {
            setShowCreateModal(false);
            setEditingConfig(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingConfig(null);
            fetchConfigs();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function ConfigCard({
  config,
  onEdit,
  onDelete,
}: {
  config: CreditConfiguration;
  onEdit: (config: CreditConfiguration) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{config.name}</h3>
            {config.isDefault && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                Default
              </span>
            )}
            {config.isActive && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                Active
              </span>
            )}
          </div>
          {config.description && (
            <p className="text-gray-600 text-sm mt-1">{config.description}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Version {config.version} • Updated {new Date(config.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(config)}
            icon={<Edit2 className="w-4 h-4" />}
          />
          {!config.isDefault && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(config.configId)}
              icon={<Trash2 className="w-4 h-4" />}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Credit Tiers</h4>
          <div className="space-y-1 text-sm">
            <div>Bronze: {config.creditTiers.bronze.min}-{config.creditTiers.bronze.max}</div>
            <div>Silver: {config.creditTiers.silver.min}-{config.creditTiers.silver.max}</div>
            <div>Gold: {config.creditTiers.gold.min}-{config.creditTiers.gold.max}</div>
            <div>Platinum: {config.creditTiers.platinum.min}+</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Interest Rates</h4>
          <div className="space-y-1 text-sm">
            <div>Bronze: {config.interestRates.bronze}%</div>
            <div>Silver: {config.interestRates.silver}%</div>
            <div>Gold: {config.interestRates.gold}%</div>
            <div>Platinum: {config.interestRates.platinum}%</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Approval Rules</h4>
          <div className="space-y-1 text-sm">
            <div>Instant: {config.approvalThresholds.instantApproval.minScore}+</div>
            <div>Conditional: {config.approvalThresholds.conditionalApproval.minScore}-{config.approvalThresholds.conditionalApproval.maxScore}</div>
            <div>Manual: {config.approvalThresholds.manualReview.minScore}-{config.approvalThresholds.manualReview.maxScore}</div>
            <div>Decline: &lt;{config.approvalThresholds.autoDecline.maxScore + 1}</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Scoring Weights</h4>
          <div className="space-y-1 text-sm">
            <div>Identity: {config.scoringWeights.identity}</div>
            <div>Behavioral: {config.scoringWeights.behavioral}</div>
            <div>Financial: {config.scoringWeights.financial}</div>
            <div>Merchant: {config.scoringWeights.merchant}</div>
            <div>History: {config.scoringWeights.history}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigModal({
  config,
  onClose,
  onSave,
}: {
  config: CreditConfiguration | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<any>(
    config || {
      name: '',
      description: '',
      isActive: true,
      isDefault: false,
      creditTiers: {
        bronze: { min: 0, max: 499 },
        silver: { min: 500, max: 649 },
        gold: { min: 650, max: 799 },
        platinum: { min: 800, max: 1000 },
      },
      approvalThresholds: {
        instantApproval: { minScore: 700, maxRiskFlags: 0 },
        conditionalApproval: { minScore: 500, maxScore: 699, maxRiskFlags: 2 },
        manualReview: { minScore: 400, maxScore: 499 },
        autoDecline: { maxScore: 399 },
      },
      interestRates: {
        bronze: 2.5,
        silver: 2.0,
        gold: 1.8,
        platinum: 1.5,
      },
      autoDeclineRules: {
        maxDefaultedLoans: 2,
        maxActiveLoans: 3,
        minCreditScore: 400,
        blacklistedCustomer: true,
        suspendedCustomer: true,
      },
      scoringWeights: {
        identity: 200,
        behavioral: 200,
        financial: 300,
        merchant: 100,
        history: 200,
      },
    }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (config) {
        // Exclude configId from the update payload
        const { configId, createdBy, createdAt, updatedAt, version, ...updateData } = formData as any;
        await api.put(`/credit-config/${config.configId}`, updateData);
      } else {
        await api.post('/credit-config', formData);
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = Object.values(formData.scoringWeights).reduce((sum: number, val: any) => sum + Number(val), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {config ? 'Edit Configuration' : 'Create Configuration'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X className="w-5 h-5" />}
          />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Configuration Name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="Description"
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Set as Default</span>
              </label>
            </div>
          </div>

          {/* Interest Rates */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Interest Rates (Monthly %)</h3>
            <div className="grid grid-cols-4 gap-4">
              {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => (
                <NumberInput
                  key={tier}
                  label={tier.charAt(0).toUpperCase() + tier.slice(1)}
                  allowDecimal
                  min={0}
                  max={10}
                  required
                  value={formData.interestRates[tier]}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interestRates: {
                        ...formData.interestRates,
                        [tier]: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              ))}
            </div>
          </div>

          {/* Scoring Weights */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Scoring Weights</h3>
              <span className={`text-sm font-medium ${totalWeight === 1000 ? 'text-green-600' : 'text-red-600'}`}>
                Total: {totalWeight}/1000
              </span>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {(['identity', 'behavioral', 'financial', 'merchant', 'history'] as const).map((weight) => (
                <NumberInput
                  key={weight}
                  label={weight.charAt(0).toUpperCase() + weight.slice(1)}
                  min={0}
                  max={1000}
                  required
                  value={formData.scoringWeights[weight]}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scoringWeights: {
                        ...formData.scoringWeights,
                        [weight]: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              ))}
            </div>
          </div>

          {/* Auto-Decline Rules */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Auto-Decline Rules</h3>
            <div className="grid grid-cols-3 gap-4">
              <NumberInput
                label="Max Defaulted Loans"
                min={0}
                required
                value={formData.autoDeclineRules.maxDefaultedLoans}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    autoDeclineRules: {
                      ...formData.autoDeclineRules,
                      maxDefaultedLoans: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
              <NumberInput
                label="Max Active Loans"
                min={0}
                required
                value={formData.autoDeclineRules.maxActiveLoans}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    autoDeclineRules: {
                      ...formData.autoDeclineRules,
                      maxActiveLoans: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
              <NumberInput
                label="Min Credit Score"
                min={0}
                max={1000}
                required
                value={formData.autoDeclineRules.minCreditScore}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    autoDeclineRules: {
                      ...formData.autoDeclineRules,
                      minCreditScore: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || totalWeight !== 1000}
              loading={saving}
              icon={!saving && <Save className="w-4 h-4" />}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
