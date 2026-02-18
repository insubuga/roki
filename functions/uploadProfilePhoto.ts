import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the payload - handle both JSON and form data
    const contentType = req.headers.get('content-type') || '';
    let file_data, file_name, file_type;
    
    if (contentType.includes('application/json')) {
      const body = await req.json();
      file_data = body.file_data;
      file_name = body.file_name;
      file_type = body.file_type;
    } else {
      const body = await req.text();
      try {
        const parsed = JSON.parse(body);
        file_data = parsed.file_data;
        file_name = parsed.file_name;
        file_type = parsed.file_type;
      } catch (e) {
        return Response.json({ error: 'Invalid request format' }, { status: 400 });
      }
    }

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

    // Convert base64 to file
    const base64Data = file_data.split(',')[1] || file_data;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const file = new File([binaryData], file_name, { type: file_type });

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Upload file
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    if (!uploadResult.file_url) {
      throw new Error('Upload failed');
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