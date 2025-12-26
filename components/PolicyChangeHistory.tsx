'use client';

import { useState, useEffect } from 'react';

interface PolicyChangeHistoryProps {
  policyId: string;
  policyTitle: string;
}

interface ChangeActivity {
  id: string;
  activityType: string;
  title: string;
  description?: string;
  timestamp: string;
  metadata?: any;
  performer: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
}

export default function PolicyChangeHistory({ policyId, policyTitle }: PolicyChangeHistoryProps) {
  const [activities, setActivities] = useState<ChangeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicyHistory();
  }, [policyId]);

  const fetchPolicyHistory = async () => {
    try {
      const response = await fetch(`/api/timeline?entityType=POLICY&entityId=${policyId}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response structure
        setActivities(data.activities || data || []);
      }
    } catch (error) {
      console.error('Error fetching policy history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'CREATED':
        return '🆕';
      case 'UPDATED':
        return '✏️';
      case 'STATUS_CHANGED':
        return '🔄';
      case 'FILE_UPLOADED':
        return '📎';
      case 'POLICY_REVIEWED':
        return '👀';
      case 'PUBLISHED':
        return '📢';
      case 'ARCHIVED':
        return '📦';
      case 'DELETED':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'CREATED':
        return 'bg-green-100 text-green-800';
      case 'UPDATED':
        return 'bg-blue-100 text-blue-800';
      case 'STATUS_CHANGED':
        return 'bg-purple-100 text-purple-800';
      case 'FILE_UPLOADED':
        return 'bg-indigo-100 text-indigo-800';
      case 'POLICY_REVIEWED':
        return 'bg-yellow-100 text-yellow-800';
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      case 'DELETED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatChangeDetails = (metadata: any) => {
    if (!metadata) return null;

    const details = [];

    // Handle version changes
    if (metadata.version) {
      details.push(`Version: ${metadata.version}`);
    }

    if (metadata.versionIncremented) {
      details.push('🔢 Version incremented due to significant changes');
    }

    // Handle status changes
    if (metadata.oldStatus && metadata.newStatus) {
      details.push(`Status: ${metadata.oldStatus} → ${metadata.newStatus}`);
    }

    // Handle file changes
    if (metadata.fileName) {
      details.push(`📎 File: ${metadata.fileName}`);
    }

    if (metadata.fileSize) {
      details.push(`📏 Size: ${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB`);
    }

    // Handle field changes
    if (metadata.changes && Array.isArray(metadata.changes)) {
      details.push('📝 Fields changed:');
      metadata.changes.forEach((change: any) => {
        if (change.field === 'content') {
          details.push(`  • Content: Updated`);
        } else if (change.field === 'title') {
          details.push(`  • Title: "${change.oldValue}" → "${change.newValue}"`);
        } else if (change.field === 'category') {
          details.push(`  • Category: ${change.oldValue} → ${change.newValue}`);
        } else if (change.field === 'file') {
          details.push(`  • File: ${change.oldValue || 'None'} → ${change.newValue || 'None'}`);
        } else {
          details.push(`  • ${change.field}: ${change.oldValue || 'None'} → ${change.newValue || 'None'}`);
        }
      });
    }

    // Handle review information
    if (metadata.reviewDate) {
      details.push(`📅 Next review: ${new Date(metadata.reviewDate).toLocaleDateString()}`);
    }

    if (metadata.effectiveDate) {
      details.push(`📅 Effective: ${new Date(metadata.effectiveDate).toLocaleDateString()}`);
    }

    if (metadata.expiryDate) {
      details.push(`📅 Expires: ${new Date(metadata.expiryDate).toLocaleDateString()}`);
    }

    return details;
  };

  const toggleExpanded = (activityId: string) => {
    setExpandedActivity(expandedActivity === activityId ? null : activityId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading policy history...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-gray-500">No activity history found for this policy.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-800">
          Policy Change History ({activities.length} activities)
        </h4>
        <button
          onClick={fetchPolicyHistory}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity, index) => {
          const isExpanded = expandedActivity === activity.id;
          const changeDetails = formatChangeDetails(activity.metadata);
          const hasDetails = changeDetails && changeDetails.length > 0;

          return (
            <div key={activity.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    <span className="text-lg">{getActivityIcon(activity.activityType)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActivityColor(activity.activityType)}`}>
                        {activity.activityType.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <h5 className="text-sm font-medium text-gray-900 mb-1">
                      {activity.title}
                    </h5>
                    
                    {activity.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {activity.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        by {activity.performer.name} ({activity.performer.department})
                      </div>
                      {hasDetails && (
                        <button
                          onClick={() => toggleExpanded(activity.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          {isExpanded ? 'Hide details' : 'Show details'}
                          <svg 
                            className={`w-3 h-3 ml-1 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {isExpanded && hasDetails && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <div className="text-xs text-gray-700 space-y-1">
                          {changeDetails.map((detail, idx) => (
                            <div key={idx} className={detail.startsWith('  •') ? 'ml-4' : ''}>
                              {detail}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activities.length >= 50 && (
        <div className="text-center py-2">
          <span className="text-xs text-gray-500">
            Showing last 50 activities. Older activities may be available in the audit log.
          </span>
        </div>
      )}
    </div>
  );
}