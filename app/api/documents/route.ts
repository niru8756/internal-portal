import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { logCreatedActivity, logTimelineActivity, logUpdatedActivity, logStatusChangedActivity } from '@/lib/timeline';

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      category, 
      content, 
      ownerId, 
      status,
      tags,
      filePath,
      fileSize,
      mimeType
    } = body;

    const document = await prisma.document.create({
      data: {
        title,
        category,
        content,
        ownerId,
        status: status || 'DRAFT',
        version: 1,
        tags: tags || [],
        filePath,
        fileSize,
        mimeType
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    // Log audit trail
    await logAudit({
      entityType: 'DOCUMENT',
      entityId: document.id,
      changedById: ownerId,
      fieldChanged: 'created',
      oldValue: null,
      newValue: JSON.stringify(document)
    });

    // Log timeline activity
    await logCreatedActivity(
      'DOCUMENT',
      document.id,
      document.title,
      ownerId,
      {
        category: document.category,
        status: document.status,
        tags: document.tags,
        hasFile: !!document.filePath
      }
    );

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const updatedBy = searchParams.get('updatedBy') || 'system';

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      title, 
      category, 
      content, 
      status,
      tags,
      filePath,
      fileSize,
      mimeType
    } = body;

    // Get current document for comparison
    const currentDocument = await prisma.document.findUnique({
      where: { id },
      select: {
        title: true,
        category: true,
        content: true,
        status: true,
        version: true,
        tags: true,
        filePath: true
      }
    });

    if (!currentDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Track changes
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    if (title !== currentDocument.title) {
      changes.push({ field: 'title', oldValue: currentDocument.title, newValue: title });
    }
    if (category !== currentDocument.category) {
      changes.push({ field: 'category', oldValue: currentDocument.category, newValue: category });
    }
    if (content !== currentDocument.content) {
      changes.push({ field: 'content', oldValue: 'Content updated', newValue: 'Content updated' });
    }
    if (status !== currentDocument.status) {
      changes.push({ field: 'status', oldValue: currentDocument.status, newValue: status });
    }
    if (JSON.stringify(tags) !== JSON.stringify(currentDocument.tags)) {
      changes.push({ field: 'tags', oldValue: currentDocument.tags.join(', '), newValue: tags.join(', ') });
    }

    // Increment version if there are significant changes
    const shouldIncrementVersion = changes.some(change => 
      ['content', 'status'].includes(change.field)
    );

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        title,
        category,
        content,
        status,
        version: shouldIncrementVersion ? currentDocument.version + 1 : currentDocument.version,
        tags: tags || [],
        filePath,
        fileSize,
        mimeType
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    // Log audit trail for each change
    for (const change of changes) {
      await logAudit({
        entityType: 'DOCUMENT',
        entityId: id,
        changedById: updatedBy,
        fieldChanged: change.field,
        oldValue: change.oldValue?.toString() || null,
        newValue: change.newValue?.toString() || null
      });
    }

    // Log timeline activity
    await logUpdatedActivity(
      'DOCUMENT',
      id,
      updatedDocument.title,
      updatedBy,
      changes,
      {
        version: updatedDocument.version,
        status: updatedDocument.status,
        tags: updatedDocument.tags,
        versionIncremented: shouldIncrementVersion
      }
    );

    // Log status change if status changed
    if (status !== currentDocument.status) {
      await logStatusChangedActivity(
        'DOCUMENT',
        id,
        updatedDocument.title,
        updatedBy,
        currentDocument.status,
        status,
        {
          version: updatedDocument.version
        }
      );
    }

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deletedBy = searchParams.get('deletedBy') || 'system';

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Get document details before deletion for logging
    const document = await prisma.document.findUnique({
      where: { id },
      select: { title: true, category: true, status: true, tags: true }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete the document
    await prisma.document.delete({
      where: { id }
    });

    // Log audit trail
    await logAudit({
      entityType: 'DOCUMENT',
      entityId: id,
      changedById: deletedBy,
      fieldChanged: 'deleted',
      oldValue: JSON.stringify(document),
      newValue: null
    });

    // Log timeline activity
    await logTimelineActivity({
      entityType: 'DOCUMENT',
      entityId: id,
      activityType: 'DELETED',
      title: `Deleted document: ${document.title}`,
      description: `Document "${document.title}" (${document.category}) was removed from the system`,
      metadata: {
        documentTitle: document.title,
        category: document.category,
        status: document.status,
        tags: document.tags
      },
      performedBy: deletedBy,
      documentId: id
    });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}