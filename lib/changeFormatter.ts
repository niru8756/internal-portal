// lib/changeFormatter.ts

export interface ChangeData {
  field: string;
  oldValue: any;
  newValue: any;
}

export function formatFieldName(field: string): string {
  const fieldNames: { [key: string]: string } = {
    'name': 'Name',
    'email': 'Email',
    'role': 'Role',
    'department': 'Department',
    'manager': 'Manager',
    'managerId': 'Manager',
    'status': 'Status',
    'joiningDate': 'Joining Date',
    'phone': 'Phone',
    'title': 'Title',
    'category': 'Category',
    'content': 'Content',
    'version': 'Version',
    'effectiveDate': 'Effective Date',
    'expiryDate': 'Expiry Date',
    'reviewDate': 'Review Date',
    'type': 'Type',
    'serialNumber': 'Serial Number',
    'location': 'Location',
    'purchaseDate': 'Purchase Date',
    'warrantyExpiry': 'Warranty Expiry'
  };

  return fieldNames[field] || field.charAt(0).toUpperCase() + field.slice(1);
}

export function formatValue(value: any, field: string): string {
  if (value === null || value === undefined) {
    return 'None';
  }

  // Handle dates
  if (field.toLowerCase().includes('date') || field.toLowerCase().includes('Date')) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (e) {
      // Fall through to default handling
    }
  }

  // Handle role formatting
  if (field === 'role') {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  // Handle status formatting
  if (field === 'status') {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  // Handle manager ID (convert to readable format)
  if (field === 'manager' || field === 'managerId') {
    if (value === '526f29fe-04c1-44ee-862f-10c18c425333') {
      return 'System User';
    }
    
    // Fallback to shortened ID for now
    // In a real implementation, you'd look up the manager name
    if (typeof value === 'string' && value.length > 10) {
      return `Manager (${value.substring(0, 8)}...)`;
    }
    return value;
  }

  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  // Handle objects (try to extract meaningful information)
  if (typeof value === 'object') {
    try {
      // Try to parse if it's a JSON string
      const obj = typeof value === 'string' ? JSON.parse(value) : value;
      
      // Handle employee objects
      if (obj.name && obj.email) {
        return `${obj.name} (${obj.email})`;
      }
      
      // Handle policy objects
      if (obj.title && obj.category) {
        return `${obj.title} (${obj.category})`;
      }
      
      // Handle resource objects
      if (obj.name && obj.type) {
        return `${obj.name} (${obj.type})`;
      }
      
      // Handle workflow objects
      if (obj.type && obj.status) {
        return `${obj.type.replace(/_/g, ' ')} - ${obj.status}`;
      }
      
      // Handle access objects
      if (obj.resourceName && obj.status) {
        return `Access to ${obj.resourceName} - ${obj.status}`;
      }
      
      // Handle document objects
      if (obj.title && obj.category) {
        return `${obj.title} (${obj.category})`;
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        if (obj.length === 0) return 'Empty list';
        if (obj.length === 1) return `1 item: ${obj[0]}`;
        return `${obj.length} items`;
      }
      
      // Handle other objects by showing key properties
      const keys = Object.keys(obj);
      if (keys.length === 0) return 'Empty object';
      
      // Look for important keys first
      const importantKeys = keys.filter(key => 
        ['name', 'title', 'email', 'type', 'status', 'category', 'description'].includes(key)
      );
      
      if (importantKeys.length > 0) {
        const values = importantKeys.map(key => `${key}: ${obj[key]}`).join(', ');
        return values.length > 150 ? values.substring(0, 150) + '...' : values;
      }
      
      // Fallback: show first few key-value pairs
      const firstKeys = keys.slice(0, 3);
      const values = firstKeys.map(key => `${key}: ${obj[key]}`).join(', ');
      const suffix = keys.length > 3 ? ` (and ${keys.length - 3} more)` : '';
      return values + suffix;
      
    } catch (e) {
      // If parsing fails, show a generic message
      return 'Complex data object';
    }
  }

  return String(value);
}

export function formatChange(change: ChangeData): string {
  const fieldName = formatFieldName(change.field);
  const oldValue = formatValue(change.oldValue, change.field);
  const newValue = formatValue(change.newValue, change.field);

  if (change.oldValue === null || change.oldValue === undefined) {
    return `${fieldName} set to "${newValue}"`;
  }

  if (change.newValue === null || change.newValue === undefined) {
    return `${fieldName} cleared (was "${oldValue}")`;
  }

  return `${fieldName} changed from "${oldValue}" to "${newValue}"`;
}

export function formatMultipleChanges(changes: ChangeData[]): string {
  if (changes.length === 0) {
    return 'No changes detected';
  }

  if (changes.length === 1) {
    return formatChange(changes[0]);
  }

  const formattedChanges = changes.map(change => formatChange(change));
  
  if (changes.length <= 3) {
    return formattedChanges.join('; ');
  }

  // For many changes, show first 2 and count
  return `${formattedChanges.slice(0, 2).join('; ')} and ${changes.length - 2} more changes`;
}

// Helper function to parse changes from audit log values
export function parseChangesFromAuditLog(oldValue: string | null, newValue: string | null, fieldChanged: string): ChangeData[] {
  try {
    // Handle special field types
    if (fieldChanged === 'created') {
      // Try to extract meaningful info from the created object
      if (newValue) {
        try {
          const obj = JSON.parse(newValue);
          if (obj.name) {
            return [{
              field: 'record',
              oldValue: null,
              newValue: `Created: ${obj.name}`
            }];
          }
          if (obj.title) {
            return [{
              field: 'record',
              oldValue: null,
              newValue: `Created: ${obj.title}`
            }];
          }
        } catch (e) {
          // Fall through to default
        }
      }
      return [{
        field: 'record',
        oldValue: null,
        newValue: 'Created'
      }];
    }

    if (fieldChanged === 'deleted') {
      // Try to extract meaningful info from the deleted object
      if (oldValue) {
        try {
          const obj = JSON.parse(oldValue);
          if (obj.name) {
            return [{
              field: 'record',
              oldValue: `Deleted: ${obj.name}`,
              newValue: null
            }];
          }
          if (obj.title) {
            return [{
              field: 'record',
              oldValue: `Deleted: ${obj.title}`,
              newValue: null
            }];
          }
        } catch (e) {
          // Fall through to default
        }
      }
      return [{
        field: 'record',
        oldValue: 'Existed',
        newValue: null
      }];
    }

    if (fieldChanged.includes('deletion_')) {
      const status = fieldChanged.replace('deletion_', '').replace('_', ' ');
      return [{
        field: 'deletion_status',
        oldValue: null,
        newValue: status.charAt(0).toUpperCase() + status.slice(1)
      }];
    }

    // Handle multiple field changes (when oldValue or newValue contains multiple changes)
    if (oldValue && newValue) {
      try {
        const oldObj = JSON.parse(oldValue);
        const newObj = JSON.parse(newValue);
        
        if (typeof oldObj === 'object' && typeof newObj === 'object') {
          const changes: ChangeData[] = [];
          const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
          
          for (const key of allKeys) {
            if (oldObj[key] !== newObj[key]) {
              changes.push({
                field: key,
                oldValue: oldObj[key],
                newValue: newObj[key]
              });
            }
          }
          
          if (changes.length > 0) {
            return changes;
          }
        }
      } catch (e) {
        // Fall through to single field change
      }
    }

    // Handle single field changes
    return [{
      field: fieldChanged,
      oldValue: oldValue,
      newValue: newValue
    }];

  } catch (error) {
    console.error('Error parsing changes:', error);
    return [{
      field: fieldChanged,
      oldValue: oldValue,
      newValue: newValue
    }];
  }
}