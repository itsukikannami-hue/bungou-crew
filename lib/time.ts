export function toJST(dateString: string) {
    return new Date(dateString).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo"
    })
  }
  
  export function toJSTDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo"
    })
  }