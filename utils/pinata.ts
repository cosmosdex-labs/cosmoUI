"use client";

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: {
    admin_addr: string;
    decimals: number;
    total_supply: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    created_at: string;
  };
}

export interface UploadResult {
  success: boolean;
  imageHash?: string;
  metadataHash?: string;
  imageUrl?: string;
  metadataUrl?: string;
  error?: string;
}

/**
 * Upload image to Pinata IPFS using REST API
 */
export const uploadImageToPinata = async (file: File): Promise<{ success: boolean; hash?: string; url?: string; error?: string }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const hash = result.IpfsHash;
    const url = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${hash}`;

    return {
      success: true,
      hash,
      url,
    };
  } catch (error) {
    console.error("Error uploading image to Pinata:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload image",
    };
  }
};

/**
 * Upload token metadata JSON to Pinata IPFS using REST API
 */
export const uploadTokenMetadata = async (metadata: TokenMetadata): Promise<{ success: boolean; hash?: string; url?: string; error?: string }> => {
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataMetadata: {
          name: `${metadata.symbol}_metadata.json`,
        },
        pinataContent: metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const hash = result.IpfsHash;
    const url = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${hash}`;

    return {
      success: true,
      hash,
      url,
    };
  } catch (error) {
    console.error("Error uploading metadata to Pinata:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload metadata",
    };
  }
};

/**
 * Complete token upload process - both image and metadata
 */
export const uploadTokenToPinata = async (
  imageFile: File,
  tokenData: {
    name: string;
    symbol: string;
    description: string;
    admin_addr: string;
    decimals: number;
    total_supply: string;
    website?: string;
    twitter?: string;
    telegram?: string;
  }
): Promise<UploadResult> => {
  try {
    // Step 1: Upload image
    const imageResult = await uploadImageToPinata(imageFile);
    if (!imageResult.success) {
      return {
        success: false,
        error: imageResult.error,
      };
    }

    // Step 2: Create and upload metadata
    const metadata: TokenMetadata = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      description: tokenData.description,
      image: imageResult.url!,
      attributes: {
        admin_addr: tokenData.admin_addr,
        decimals: tokenData.decimals,
        total_supply: tokenData.total_supply,
        website: tokenData.website,
        twitter: tokenData.twitter,
        telegram: tokenData.telegram,
        created_at: new Date().toISOString(),
      },
    };

    const metadataResult = await uploadTokenMetadata(metadata);
    if (!metadataResult.success) {
      return {
        success: false,
        error: metadataResult.error,
      };
    }

    return {
      success: true,
      imageHash: imageResult.hash,
      metadataHash: metadataResult.hash,
      imageUrl: imageResult.url,
      metadataUrl: metadataResult.url,
    };
  } catch (error) {
    console.error("Error in complete token upload:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload token",
    };
  }
};

/**
 * Validate file before upload
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 10MB' };
  }

  // Check file extension
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return { valid: false, error: 'Only JPG, PNG, GIF, and WebP images are allowed' };
  }

  return { valid: true };
}; 