/**
 * Cấu hình Capacitor Android cho 2 ứng dụng di động nội bộ HoNa Fresh:
 *  - Nhân viên kho QC: CAP_APP_ROLE=qc (com.honafresh.qc)
 *  - Tài xế xe lạnh:   CAP_APP_ROLE=driver (com.honafresh.driver)
 *
 * Khi build APK trỏ về server đang chạy (ví dụ IP LAN hoặc domain thật):
 *  - Đặt CAPACITOR_SERVER_URL=http://<IP_LAN>:3000 để chạy live bundle, hoặc
 *  - Export static Next.js (`out/`) khi dùng chế độ gọi thẳng Backend API.
 */
const appRole = (process.env.CAP_APP_ROLE || 'driver').toLowerCase();
const isQcApp = appRole === 'qc';

const config = {
  appId: isQcApp ? 'com.honafresh.qc' : 'com.honafresh.driver',
  appName: isQcApp ? 'HoNa Fresh - Nhân Viên Kho QC' : 'HoNa Fresh - Tài Xế Xe Lạnh',
  webDir: 'out',
  bundledWebRuntime: false,
  server: process.env.CAPACITOR_SERVER_URL
    ? {
        url: `${process.env.CAPACITOR_SERVER_URL.replace(/\/$/, '')}/dang-nhap?redirect=${
          isQcApp ? '/portal/warehouse-qc' : '/portal/driver'
        }`,
        cleartext: true,
        androidScheme: 'http',
      }
    : {
        androidScheme: 'https',
      },
  android: {
    allowMixedContent: true,
  },
};

export default config;
