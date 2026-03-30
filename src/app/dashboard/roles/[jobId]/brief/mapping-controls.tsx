'use client';

import { useState } from 'react';
import { useUpdateMapping, useDeleteMapping } from '@/lib/hooks/use-role-brief';

interface MappingControlsProps {
  mappingId: string;
  jobId: string;
}

export function MappingControls({ mappingId, jobId }: MappingControlsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    decision: '',
    reason: '',
    manualOverrideReason: '',
  });

  const updateMapping = useUpdateMapping(jobId);
  const deleteMapping = useDeleteMapping(jobId);

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      decision: '',
      reason: '',
      manualOverrideReason: '',
    });
  };

  const handleSave = async () => {
    if (!editForm.manualOverrideReason.trim()) {
      alert('Manual override reason is required');
      return;
    }

    try {
      await updateMapping.mutateAsync({
        mappingId,
        updates: {
          decision: editForm.decision || undefined,
          reason: editForm.reason || undefined,
          manualOverrideReason: editForm.manualOverrideReason,
        },
      });
      setIsEditing(false);
      setEditForm({ decision: '', reason: '', manualOverrideReason: '' });
    } catch (err) {
      console.error('Failed to update mapping:', err);
      alert('Failed to update mapping');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({ decision: '', reason: '', manualOverrideReason: '' });
  };

  const handleDelete = async () => {
    try {
      await deleteMapping.mutateAsync(mappingId);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete mapping:', err);
      alert('Failed to delete mapping');
    }
  };

  return (
    <div className="mt-3">
      {!isEditing && !showDeleteConfirm && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleEdit}
            className="text-blue-600 text-sm hover:underline"
            disabled={updateMapping.isPending}
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 text-sm hover:underline"
            disabled={deleteMapping.isPending}
          >
            Remove
          </button>
        </div>
      )}

      {isEditing && (
        <div className="border rounded p-3 mt-2 bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Decision
            </label>
            <select
              value={editForm.decision}
              onChange={(e) => setEditForm({ ...editForm, decision: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Keep current</option>
              <option value="match">Match</option>
              <option value="weak_match">Weak Match</option>
              <option value="no_match">No Match</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <textarea
              value={editForm.reason}
              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Update the reason for this mapping..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Manual Override Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              value={editForm.manualOverrideReason}
              onChange={(e) =>
                setEditForm({ ...editForm, manualOverrideReason: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Why are you making this change? (required)"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={updateMapping.isPending}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {updateMapping.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={updateMapping.isPending}
              className="text-gray-600 text-sm hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="border rounded p-3 mt-2 bg-red-50 border-red-200">
          <p className="text-sm text-red-800 mb-3">
            Are you sure you want to remove this mapping?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteMapping.isPending}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {deleteMapping.isPending ? 'Removing...' : 'Confirm Remove'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteMapping.isPending}
              className="text-gray-600 text-sm hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
