import React, { useState, useEffect } from 'react';
import { Settings, Play, CheckCircle, AlertTriangle, Loader, Sparkles } from 'lucide-react';
import { fetchWithAuth } from '../../App.jsx';

export default function AgentSettings({ authHeaders, apiUrl }) {
  const [config, setConfig] = useState({
    agent_target_url: '',
    agent_ai_prompt: '',
    agent_target_email: '',
    agent_gemini_api_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${apiUrl}/settings`);
      const data = await res.json();
      if (data.success) {
        setConfig({
          agent_target_url: data.settings.agent_target_url || '',
          agent_ai_prompt: data.settings.agent_ai_prompt || '',
          agent_target_email: data.settings.agent_target_email || '',
          agent_gemini_api_key: data.settings.agent_gemini_api_key || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      setError('');
      
      const payload = { settings: config };
      
      const res = await fetchWithAuth(`${apiUrl}/settings`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Settings saved successfully');
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTrigger = async () => {
    try {
      setTriggering(true);
      setMessage('');
      setError('');
      
      const res = await fetchWithAuth(`${apiUrl}/agent/trigger`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Agent executed successfully! Email sent.');
      } else {
        setError(data.error || 'Failed to execute agent');
      }
    } catch (err) {
      setError('Network error executing agent');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-700 pb-4">
        <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">AI Agent Configuration</h2>
          <p className="text-gray-400">Configure your Gemini-powered web scraping agent</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8"><Loader className="animate-spin mx-auto text-purple-400 mb-2" /> Loading settings...</div>
      ) : (
        <div className="space-y-6 bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          {message && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle size={20} />
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle size={20} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Gemini API Key</label>
              <input
                type="password"
                value={config.agent_gemini_api_key}
                onChange={e => setConfig({...config, agent_gemini_api_key: e.target.value})}
                placeholder="AIzaSy..."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Your Google Gemini API key required for natural language processing.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Target Website URL</label>
              <input
                type="url"
                value={config.agent_target_url}
                onChange={e => setConfig({...config, agent_target_url: e.target.value})}
                placeholder="https://example.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">AI Prompt (What should it extract?)</label>
              <textarea
                value={config.agent_ai_prompt}
                onChange={e => setConfig({...config, agent_ai_prompt: e.target.value})}
                placeholder="e.g. Find all the product prices on this page and list them as bullet points. Extract the main headline as well."
                className="w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Describe in plain English what data you want the AI to extract from the webpage.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Recipient Email</label>
              <input
                type="email"
                value={config.agent_target_email}
                onChange={e => setConfig({...config, agent_target_email: e.target.value})}
                placeholder="admin@yourrestaurant.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {saving ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              Save Configuration
            </button>
            <button
              onClick={handleTrigger}
              disabled={triggering || !config.agent_target_url || !config.agent_ai_prompt || !config.agent_target_email || !config.agent_gemini_api_key}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {triggering ? <Loader className="animate-spin" size={18} /> : <Play size={18} />}
              Run AI Agent Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
