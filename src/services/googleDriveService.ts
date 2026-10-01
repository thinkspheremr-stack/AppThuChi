export interface DriveFileItem {
  id: string;
  name: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface DriveBackupResult {
  fileId: string;
  fileName: string;
  modifiedTime: string;
  webViewLink?: string;
}

/**
 * Uploads finance data to Google Drive as SoThuChi_Backup.json
 * If a file with that name exists, it updates it; otherwise it creates a new one.
 */
export async function uploadBackupToGoogleDrive(
  data: any,
  accessToken: string
): Promise<DriveBackupResult> {
  if (!accessToken) {
    throw new Error('Chưa có mã ủy quyền Google Drive. Vui lòng đăng nhập lại Google.');
  }

  // 1. Search for existing file
  const searchUrl =
    "https://www.googleapis.com/drive/v3/files?q=name='SoThuChi_Backup.json' and trashed=false&fields=files(id,name,modifiedTime,webViewLink)";

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => null);
    throw new Error(err?.error?.message || `Lỗi kết nối Google Drive: ${searchRes.status}`);
  }

  const searchJson = await searchRes.json();
  const existingFile = searchJson.files && searchJson.files.length > 0 ? searchJson.files[0] : null;

  const contentStr = JSON.stringify(data, null, 2);

  if (existingFile) {
    // 2a. Update existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media&fields=id,name,modifiedTime,webViewLink`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: contentStr,
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => null);
      throw new Error(err?.error?.message || `Lỗi khi cập nhật file trên Google Drive`);
    }

    const updatedFile = await updateRes.json();
    return {
      fileId: updatedFile.id || existingFile.id,
      fileName: updatedFile.name || 'SoThuChi_Backup.json',
      modifiedTime: updatedFile.modifiedTime || new Date().toISOString(),
      webViewLink: updatedFile.webViewLink || existingFile.webViewLink,
    };
  } else {
    // 2b. Create new file with multipart upload
    const metadata = {
      name: 'SoThuChi_Backup.json',
      mimeType: 'application/json',
      description: 'Bản sao lưu sổ thu chi cá nhân tự động lưu từ ứng dụng',
    };

    const boundary = '-------SoThuChiBoundary' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      contentStr +
      closeDelimiter;

    const createUrl =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,webViewLink';
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => null);
      throw new Error(err?.error?.message || `Lỗi khi tạo file mới trên Google Drive`);
    }

    const createdFile = await createRes.json();
    return {
      fileId: createdFile.id,
      fileName: createdFile.name || 'SoThuChi_Backup.json',
      modifiedTime: createdFile.modifiedTime || new Date().toISOString(),
      webViewLink: createdFile.webViewLink,
    };
  }
}

/**
 * Searches for all backup files in user's Google Drive matching SoThuChi
 */
export async function listDriveBackupFiles(accessToken: string): Promise<DriveFileItem[]> {
  if (!accessToken) {
    throw new Error('Chưa có mã ủy quyền Google Drive.');
  }

  const query = encodeURIComponent("name contains 'SoThuChi' and trashed=false");
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,modifiedTime,webViewLink)&orderBy=modifiedTime desc`;

  const res = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || `Lỗi khi lấy danh sách file từ Google Drive`);
  }

  const json = await res.json();
  return json.files || [];
}

/**
 * Downloads and parses backup data from a Google Drive file ID
 */
export async function downloadBackupFromGoogleDrive(
  fileId: string,
  accessToken: string
): Promise<any> {
  if (!accessToken) {
    throw new Error('Chưa có mã ủy quyền Google Drive.');
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || `Lỗi khi tải file từ Google Drive`);
  }

  const json = await res.json();
  return json;
}
