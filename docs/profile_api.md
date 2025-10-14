## 3. Cập nhật avatar

**Request:**
```
POST /api/profile/avatar
Authorization: Bearer {token}
Content-Type: application/json

{
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Response thành công:**
```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://example.com/avatar.jpg",
    "user": {
      "_id": "60d5ec9d8e8f8c2d4c8b4567",
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "phone": "0901234567",
      "role": "Driver",
      "roles": ["Customer", "Driver"],
      "address": "Đà Nẵng",
      "isEmailVerified": true,
      "avatarUrl": "https://example.com/avatar.jpg",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  },
  "message": "Cập nhật avatar thành công"
}
```