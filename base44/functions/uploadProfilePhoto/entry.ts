import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_data, file_name, file_type } = body;

    if (!file_data) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file_type)) {
      return Response.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      }, { status: 400 });
    }

    // Convert base64 to Blob
    const base64Data = file_data.split(',')[1] || file_data;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const blob = new Blob([binaryData], { type: file_type });

    // Validate file size (max 5MB)
    if (blob.size > 5 * 1024 * 1024) {
      return Response.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Create File from Blob
    const file = new File([blob], file_name, { type: file_type });

    // Upload file using Core integration
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    if (!uploadResult.file_url) {
      throw new Error('Upload failed - no file URL returned');
    }

    // Update user profile with new photo URL
    await base44.auth.updateMe({ profile_photo: uploadResult.file_url });

    return Response.json({ 
      success: true,
      file_url: uploadResult.file_url 
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    return Response.json({ 
      error: 'Failed to upload profile photo',
      details: error.message 
    }, { status: 500 });
  }
});