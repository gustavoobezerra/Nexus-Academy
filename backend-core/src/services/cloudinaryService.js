/**
 * Cloudinary Storage Service (FREE alternative to AWS S3)
 *
 * Setup:
 * 1. Sign up at https://cloudinary.com/ (FREE forever)
 * 2. Get credentials from dashboard
 * 3. Add to .env:
 *    CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    CLOUDINARY_API_KEY=your_api_key
 *    CLOUDINARY_API_SECRET=your_api_secret
 * 4. Install: npm install cloudinary
 * 5. Uncomment code below
 *
 * FREE TIER:
 * - 25GB storage
 * - 25GB bandwidth/month
 * - Perfect for 100-500 students
 * - Automatic image optimization
 * - CDN delivery (fast worldwide)
 *
 * WHY CLOUDINARY?
 * - 100% free for small SaaS
 * - Auto image/video optimization
 * - Built-in CDN
 * - Easy file management
 * - Supports all file types
 * - Better than S3 for startups
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const cloudinaryService = {
  isConfigured: () => !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),

  /**
   * Upload a file to Cloudinary
   * @param {string} filePath - Local file path or buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with URL
   */
  async uploadFile(filePath, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary not configured. Add credentials to .env');
    }

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: options.folder || 'nexus-academy',
        resource_type: 'auto', // Auto-detect: image, video, raw
        public_id: options.publicId,
        tags: options.tags || [],
        ...options
      });

      // DEBUG: console.log(`✅ File uploaded to Cloudinary: ${result.public_id}`);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type
      };
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async uploadAudioBuffer(buffer, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary not configured. Add credentials to .env');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'nexus-academy/pronunciation',
          resource_type: 'video',
          public_id: options.publicId,
          tags: options.tags || ['audio']
        },
        (error, result) => {
          if (error || !result) {
            console.error('❌ Cloudinary upload error:', error);
            return reject(error || new Error('Upload failed'));
          }
          return resolve({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            resourceType: result.resource_type
          });
        }
      );

      uploadStream.end(buffer);
    });
  },

  /**
   * Upload student profile picture
   */
  async uploadStudentPhoto(studentId, filePath) {
    return await this.uploadFile(filePath, {
      folder: 'nexus-academy/students',
      publicId: `student_${studentId}`,
      tags: ['student', 'profile'],
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' }, // Auto-crop to face
        { quality: 'auto', fetch_format: 'auto' } // Auto-optimize
      ]
    });
  },

  /**
   * Upload class material (PDF, document, image, video)
   */
  async uploadMaterial(classId, filePath, materialType) {
    return await this.uploadFile(filePath, {
      folder: `nexus-academy/materials/${classId}`,
      tags: ['material', materialType, `class_${classId}`],
      // For PDFs and documents, convert first page to thumbnail
      ...(materialType === 'pdf' && {
        pages: true,
        transformation: [
          { width: 800, crop: 'limit' },
          { quality: 'auto', fetch_format: 'png', page: 1 }
        ]
      })
    });
  },

  /**
   * Upload video recording of class
   */
  async uploadClassRecording(classId, videoPath) {
    // Uncomment when ready:
    /*
    const result = await cloudinary.uploader.upload(videoPath, {
      folder: `nexus-academy/recordings/${classId}`,
      resource_type: 'video',
      tags: ['recording', `class_${classId}`],
      eager: [
        { width: 1280, height: 720, crop: 'limit', quality: 'auto', format: 'mp4' },
        { width: 640, height: 480, crop: 'limit', quality: 'auto', format: 'mp4' }
      ], // Create multiple sizes
      eager_async: true // Process in background
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      format: result.format
    };
    */

    // DEBUG: console.log(`☁️ [Cloudinary Mock] Class recording would be uploaded`);
    return {
      success: true,
      url: `https://res.cloudinary.com/demo/video/upload/recording_${classId}.mp4`,
      publicId: `recording_${classId}`,
      duration: 3600,
      mock: true
    };
  },

  /**
   * Upload homework/assignment file from student
   */
  async uploadHomework(studentId, classId, filePath) {
    return await this.uploadFile(filePath, {
      folder: `nexus-academy/homework/${classId}`,
      publicId: `homework_${studentId}_${Date.now()}`,
      tags: ['homework', `student_${studentId}`, `class_${classId}`]
    });
  },

  /**
   * Delete a file from Cloudinary
   */
  async deleteFile(publicId, resourceType = 'image') {
    // Uncomment when ready:
    /*
    if (!this.isConfigured()) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });

      // DEBUG: console.log(`✅ File deleted from Cloudinary: ${publicId}`);
      return { success: true, result: result.result };
    } catch (error) {
      console.error('❌ Cloudinary delete error:', error);
      return { success: false, error: error.message };
    }
    */

    // DEBUG: console.log(`☁️ [Cloudinary Mock] File would be deleted: ${publicId}`);
    return { success: true, result: 'ok', mock: true };
  },

  /**
   * Get all files for a specific student
   */
  async getStudentFiles(studentId) {
    // Uncomment when ready:
    /*
    const result = await cloudinary.search
      .expression(`tags:student_${studentId}`)
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute();

    return {
      success: true,
      files: result.resources.map(file => ({
        url: file.secure_url,
        publicId: file.public_id,
        format: file.format,
        size: file.bytes,
        createdAt: file.created_at
      }))
    };
    */

    // DEBUG: console.log(`☁️ [Cloudinary Mock] Would fetch files for student ${studentId}`);
    return {
      success: true,
      files: [],
      mock: true
    };
  },

  /**
   * Get all materials for a class
   */
  async getClassMaterials(classId) {
    // Uncomment when ready:
    /*
    const result = await cloudinary.search
      .expression(`folder:nexus-academy/materials/${classId}`)
      .sort_by('created_at', 'desc')
      .max_results(50)
      .execute();

    return {
      success: true,
      materials: result.resources.map(file => ({
        url: file.secure_url,
        publicId: file.public_id,
        format: file.format,
        size: file.bytes,
        type: file.resource_type,
        createdAt: file.created_at
      }))
    };
    */

    // DEBUG: console.log(`☁️ [Cloudinary Mock] Would fetch materials for class ${classId}`);
    return {
      success: true,
      materials: [],
      mock: true
    };
  },

  /**
   * Generate signed URL for temporary access (expires)
   */
  async generateSignedUrl(publicId, expiresIn = 3600) {
    // Uncomment when ready:
    /*
    const timestamp = Math.round(Date.now() / 1000) + expiresIn;

    const signature = cloudinary.utils.api_sign_request(
      { public_id: publicId, timestamp: timestamp },
      process.env.CLOUDINARY_API_SECRET
    );

    const url = cloudinary.url(publicId, {
      sign_url: true,
      type: 'authenticated',
      secure: true
    });

    return { success: true, url, expiresAt: new Date(timestamp * 1000) };
    */

    // DEBUG: console.log(`☁️ [Cloudinary Mock] Would generate signed URL for ${publicId}`);
    return {
      success: true,
      url: `https://res.cloudinary.com/demo/image/authenticated/s--signature--/${publicId}`,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      mock: true
    };
  },

  /**
   * Get storage usage statistics
   */
  async getUsageStats() {
    // Uncomment when ready:
    /*
    const usage = await cloudinary.api.usage();

    return {
      success: true,
      plan: usage.plan,
      credits: {
        used: usage.credits.used,
        limit: usage.credits.limit,
        percentage: ((usage.credits.used / usage.credits.limit) * 100).toFixed(2)
      },
      storage: {
        used: usage.storage.used,
        limit: usage.storage.limit,
        usedGB: (usage.storage.used / 1024 / 1024 / 1024).toFixed(2)
      },
      bandwidth: {
        used: usage.bandwidth.used,
        limit: usage.bandwidth.limit,
        usedGB: (usage.bandwidth.used / 1024 / 1024 / 1024).toFixed(2)
      }
    };
    */

    // DEBUG: console.log('☁️ [Cloudinary Mock] Would fetch usage stats');
    return {
      success: true,
      plan: 'Free',
      credits: { used: 0, limit: 25000, percentage: '0.00' },
      storage: { used: 0, limit: 26843545600, usedGB: '0.00' },
      bandwidth: { used: 0, limit: 26843545600, usedGB: '0.00' },
      mock: true
    };
  }
};

module.exports = cloudinaryService;
