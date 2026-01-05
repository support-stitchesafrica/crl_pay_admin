import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { Input, Button } from '../components/ui';
import { integrationsService, PayoutIntegration, CreateIntegrationDto } from '../services/integrations.service';

export default function Integrations() {
  const [activeTab, setActiveTab] = useState<'payout' | 'repayment'>('payout');
  const [payoutIntegrations, setPayoutIntegrations] = useState<PayoutIntegration[]>([]);
  const [repaymentIntegrations, setRepaymentIntegrations] = useState<PayoutIntegration[]>([]);
  const [activePayoutId, setActivePayoutId] = useState<string>('');
  const [activeRepaymentId, setActiveRepaymentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<PayoutIntegration | null>(null);
  const [formData, setFormData] = useState<CreateIntegrationDto>({
    provider: 'paystack',
    mode: 'test',
    label: '',
    secretKeyEnvRef: '',
    webhookSecretEnvRef: '',
  });

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const [payout, repayment, activePayout, activeRepayment] = await Promise.all([
        integrationsService.getPayoutIntegrations(),
        integrationsService.getRepaymentIntegrations(),
        integrationsService.getActivePayoutIntegration(),
        integrationsService.getActiveRepaymentIntegration(),
      ]);

      setPayoutIntegrations(payout);
      setRepaymentIntegrations(repayment);
      setActivePayoutId(activePayout?.integrationId || '');
      setActiveRepaymentId(activeRepayment?.integrationId || '');
    } catch (error: any) {
      toast.error('Failed to load integrations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'payout') {
        await integrationsService.createPayoutIntegration(formData);
        toast.success('Payout integration created successfully');
      } else {
        await integrationsService.createRepaymentIntegration(formData);
        toast.success('Repayment integration created successfully');
      }
      setShowCreateModal(false);
      setFormData({
        provider: 'paystack',
        mode: 'test',
        label: '',
        secretKeyEnvRef: '',
        webhookSecretEnvRef: '',
      });
      loadIntegrations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create integration');
    }
  };

  const handleSetActive = async (integrationId: string, type: 'payout' | 'repayment') => {
    try {
      if (type === 'payout') {
        await integrationsService.setActivePayoutIntegration(integrationId);
        setActivePayoutId(integrationId);
        toast.success('Active payout integration updated');
      } else {
        await integrationsService.setActiveRepaymentIntegration(integrationId);
        setActiveRepaymentId(integrationId);
        toast.success('Active repayment integration updated');
      }
    } catch (error: any) {
      toast.error('Failed to update active integration');
    }
  };

  const handleDeleteIntegration = async (integrationId: string, type: 'payout' | 'repayment') => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      if (type === 'payout') {
        await integrationsService.deletePayoutIntegration(integrationId);
        toast.success('Payout integration deleted');
      } else {
        await integrationsService.deleteRepaymentIntegration(integrationId);
        toast.success('Repayment integration deleted');
      }
      await loadIntegrations();
    } catch (error: any) {
      toast.error('Failed to delete integration');
    }
  };

  const handleEditIntegration = (integration: PayoutIntegration) => {
    setEditingIntegration(integration);
    setFormData({
      provider: integration.provider,
      mode: integration.mode,
      label: integration.label,
      secretKeyEnvRef: integration.secretKeyEnvRef,
      webhookSecretEnvRef: integration.webhookSecretEnvRef || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIntegration) return;

    try {
      // Only send fields that can be updated (provider and mode are immutable)
      const updateData = {
        label: formData.label,
        secretKeyEnvRef: formData.secretKeyEnvRef,
        webhookSecretEnvRef: formData.webhookSecretEnvRef,
      };

      if (activeTab === 'payout') {
        await integrationsService.updatePayoutIntegration(editingIntegration.integrationId, updateData);
        toast.success('Payout integration updated successfully');
      } else {
        await integrationsService.updateRepaymentIntegration(editingIntegration.integrationId, updateData);
        toast.success('Repayment integration updated successfully');
      }
      setShowEditModal(false);
      setEditingIntegration(null);
      setFormData({
        provider: 'paystack',
        mode: 'test',
        label: '',
        secretKeyEnvRef: '',
        webhookSecretEnvRef: '',
      });
      await loadIntegrations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update integration');
    }
  };

  const currentIntegrations = activeTab === 'payout' ? payoutIntegrations : repaymentIntegrations;
  const currentActiveId = activeTab === 'payout' ? activePayoutId : activeRepaymentId;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Integration
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('payout')}
              className={`${
                activeTab === 'payout'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Payout Integrations
            </button>
            <button
              onClick={() => setActiveTab('repayment')}
              className={`${
                activeTab === 'repayment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Repayment Integrations
            </button>
          </nav>
        </div>

        {/* Integrations List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600">Loading integrations...</p>
            </div>
          </div>
        ) : currentIntegrations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No integrations configured yet</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
            >
              Add Integration
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {currentIntegrations.map((integration) => (
              <div
                key={integration.integrationId}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{integration.label}</h3>
                      {integration.integrationId === currentActiveId && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          Active
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        integration.mode === 'live' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {integration.mode}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Provider: <span className="font-medium capitalize">{integration.provider}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Secret Key Env: <code className="bg-gray-100 px-2 py-1 rounded">{integration.secretKeyEnvRef}</code>
                    </p>
                    {integration.webhookSecretEnvRef && (
                      <p className="text-sm text-gray-600">
                        Webhook Secret Env: <code className="bg-gray-100 px-2 py-1 rounded">{integration.webhookSecretEnvRef}</code>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {integration.integrationId !== currentActiveId && (
                      <Button
                        onClick={() => handleSetActive(integration.integrationId, activeTab)}
                        variant="primary"
                        size="sm"
                      >
                        Set as Active
                      </Button>
                    )}
                    <Button
                      onClick={() => handleEditIntegration(integration)}
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteIntegration(integration.integrationId, activeTab)}
                      variant="danger"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">
                Add {activeTab === 'payout' ? 'Payout' : 'Repayment'} Integration
              </h2>
              <form onSubmit={handleCreateIntegration} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="paystack">Paystack</option>
                    <option value="flutterwave">Flutterwave</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode
                  </label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="test">Test</option>
                    <option value="live">Live</option>
                  </select>
                </div>

                <Input
                  label="Label"
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Paystack - Main NGN (Test)"
                  required
                />

                <Input
                  label="Secret Key Environment Variable"
                  type="text"
                  value={formData.secretKeyEnvRef}
                  onChange={(e) => setFormData({ ...formData, secretKeyEnvRef: e.target.value })}
                  placeholder="e.g., PAYSTACK_SECRET_KEY"
                  helperText="The environment variable name where the secret key is stored"
                  required
                />

                <Input
                  label="Webhook Secret Environment Variable (Optional)"
                  type="text"
                  value={formData.webhookSecretEnvRef}
                  onChange={(e) => setFormData({ ...formData, webhookSecretEnvRef: e.target.value })}
                  placeholder="e.g., PAYSTACK_WEBHOOK_SECRET"
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    fullWidth
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                  >
                    Create Integration
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingIntegration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">
                Edit {activeTab === 'payout' ? 'Payout' : 'Repayment'} Integration
              </h2>
              <form onSubmit={handleUpdateIntegration} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <select
                    value={formData.provider}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  >
                    <option value="paystack">Paystack</option>
                    <option value="flutterwave">Flutterwave</option>
                    <option value="stripe">Stripe</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Provider cannot be changed after creation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode
                  </label>
                  <select
                    value={formData.mode}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  >
                    <option value="test">Test</option>
                    <option value="live">Live</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Mode cannot be changed after creation</p>
                </div>

                <Input
                  label="Label"
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Paystack - Main NGN (Test)"
                  required
                />

                <Input
                  label="Secret Key Environment Variable"
                  type="text"
                  value={formData.secretKeyEnvRef}
                  onChange={(e) => setFormData({ ...formData, secretKeyEnvRef: e.target.value })}
                  placeholder="e.g., PAYSTACK_SECRET_KEY"
                  helperText="The environment variable name where the secret key is stored"
                  required
                />

                <Input
                  label="Webhook Secret Environment Variable (Optional)"
                  type="text"
                  value={formData.webhookSecretEnvRef}
                  onChange={(e) => setFormData({ ...formData, webhookSecretEnvRef: e.target.value })}
                  placeholder="e.g., PAYSTACK_WEBHOOK_SECRET"
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingIntegration(null);
                    }}
                    fullWidth
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                  >
                    Update Integration
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
