import path from 'path'
import fs from 'fs' //1 modules chứa các method xử lý file

export const initFolder = () => {
  //lưu đường dẫn đến thư mục sẽ lưu file
  const uploadsFolderPath = path.resolve('uploads')
  //truy vết đường link này xem có đến đc thư mục này ko ?
  //nếu mà tìm ko đc thì tạo mới thư mục
  if (!fs.existsSync(uploadsFolderPath)) {
    fs.mkdirSync(uploadsFolderPath, {
      recursive: true // cho phép tạo lồng các thư mục trong tương lai nếu cần
    })
  }
}
