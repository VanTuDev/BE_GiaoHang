# API Upload Ảnh

## 1. Upload một ảnh

API này cho phép upload một ảnh lên Cloudinary thông qua backend.

**Request:**
```
POST /api/upload/image
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [file]
folder: "vehicles" (optional, default: "default")
```

**Response thành công:**
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/vehicles/abcdef.jpg",
    "publicId": "vehicles/abcdef",
    "width": 800,
    "height": 600,
    "format": "jpg",
    "resourceType": "image"
  }
}
```

**Response lỗi:**
```json
{
  "success": false,
  "message": "Lỗi khi upload ảnh",
  "error": "Lỗi chi tiết"
}
```

## 2. Upload nhiều ảnh

API này cho phép upload nhiều ảnh cùng lúc lên Cloudinary thông qua backend.

**Request:**
```
POST /api/upload/images
Authorization: Bearer {token}
Content-Type: multipart/form-data

files: [file1, file2, ...]
folder: "vehicles" (optional, default: "default")
```

**Response thành công:**
```json
{
  "success": true,
  "data": [
    {
      "url": "https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/vehicles/abcdef1.jpg",
      "publicId": "vehicles/abcdef1",
      "width": 800,
      "height": 600,
      "format": "jpg",
      "resourceType": "image"
    },
    {
      "url": "https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/vehicles/abcdef2.jpg",
      "publicId": "vehicles/abcdef2",
      "width": 800,
      "height": 600,
      "format": "jpg",
      "resourceType": "image"
    }
  ]
}
```

**Response lỗi:**
```json
{
  "success": false,
  "message": "Lỗi khi upload ảnh",
  "error": "Lỗi chi tiết"
}
```

## Lưu ý

1. Tất cả các API đều yêu cầu xác thực bằng JWT token.
2. Kích thước tối đa cho mỗi ảnh là 10MB.
3. Định dạng ảnh được hỗ trợ: JPEG, PNG, GIF, WebP, BMP.
4. Tham số `folder` là tùy chọn, nếu không được cung cấp, ảnh sẽ được lưu vào thư mục "default".
5. Kết quả trả về sẽ bao gồm URL của ảnh đã upload, có thể sử dụng trực tiếp trong ứng dụng.
6. Thuộc tính `url` trong response là secure URL (https) của ảnh trên Cloudinary.

## Cấu hình Cloudinary

Để sử dụng API upload, bạn cần cấu hình Cloudinary trong file `.env`:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Xem thêm chi tiết trong file [env_setup.md](./env_setup.md).