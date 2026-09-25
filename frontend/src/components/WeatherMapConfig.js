export const REGION_CONFIGS = {
  'Andhra Pradesh & Telangana': {
    center: [79.2000, 17.2000],
    zoom: 6.8,
    bounds: { minLat: 15.0, maxLat: 19.8, minLon: 76.5, maxLon: 83.5 },
    mainLocation: { name: 'Hyderabad, Telangana', lat: '17.3850', lon: '78.4867' },
    cities: [
      { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, isMain: true },
      { name: 'Telangana', lat: 18.1124, lon: 79.0193, isState: true },
      { name: 'Andhra Pradesh', lat: 15.9129, lon: 79.7400, isState: true },
      { name: 'Warangal', lat: 17.9689, lon: 79.5941 },
      { name: 'Khammam', lat: 17.2473, lon: 80.1514 },
      { name: 'Nalgonda', lat: 17.0577, lon: 79.2684 },
      { name: 'Vijayawada', lat: 16.5062, lon: 80.6480 },
      { name: 'Machilipatnam', lat: 16.1875, lon: 81.1389 },
      { name: 'Ongole', lat: 15.5057, lon: 80.0499 },
      { name: 'Nellore', lat: 14.4426, lon: 79.9865 },
      { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185 },
      { name: 'Kakinada', lat: 16.9891, lon: 82.2475 }
    ],
    lightning: [
      [78.42, 17.48], [78.52, 17.32], [78.60, 17.55], [78.35, 17.25],
      [79.85, 15.65], [79.95, 15.45], [80.15, 15.35],
      [79.45, 17.85], [79.20, 17.15]
    ]
  },
  'East Coast (Odisha & WB)': {
    center: [85.8245, 20.4000],
    zoom: 6.8,
    bounds: { minLat: 18.5, maxLat: 23.5, minLon: 83.0, maxLon: 89.0 },
    mainLocation: { name: 'Bhubaneswar, Odisha', lat: '20.2961', lon: '85.8245' },
    cities: [
      { name: 'Bhubaneswar', lat: 20.2961, lon: 85.8245, isMain: true },
      { name: 'Odisha', lat: 20.9517, lon: 85.0985, isState: true },
      { name: 'West Bengal', lat: 22.9868, lon: 87.8550, isState: true },
      { name: 'Cuttack', lat: 20.4625, lon: 85.8828 },
      { name: 'Puri', lat: 19.8135, lon: 85.8312 },
      { name: 'Balasore', lat: 21.4934, lon: 86.9135 },
      { name: 'Kolkata', lat: 22.5726, lon: 88.3639, isMain: true },
      { name: 'Kharagpur', lat: 22.3460, lon: 87.2320 },
      { name: 'Berhampur', lat: 19.3150, lon: 84.7941 },
      { name: 'Digha', lat: 21.6266, lon: 87.5074 }
    ],
    lightning: [
      [85.85, 20.35], [85.95, 20.50], [86.10, 20.20], [86.85, 21.45],
      [87.35, 22.25], [88.25, 22.60], [87.50, 21.65]
    ]
  },
  'South Interior Karnataka': {
    center: [76.8000, 13.0000],
    zoom: 7.0,
    bounds: { minLat: 11.5, maxLat: 15.5, minLon: 74.5, maxLon: 78.8 },
    mainLocation: { name: 'Bengaluru, Karnataka', lat: '12.9716', lon: '77.5946' },
    cities: [
      { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, isMain: true },
      { name: 'Karnataka', lat: 14.5204, lon: 75.7224, isState: true },
      { name: 'Mysuru', lat: 12.2958, lon: 76.6394 },
      { name: 'Mandya', lat: 12.5218, lon: 76.8951 },
      { name: 'Tumakuru', lat: 13.3379, lon: 77.1010 },
      { name: 'Hassan', lat: 13.0072, lon: 76.0963 },
      { name: 'Kolar', lat: 13.1367, lon: 78.1291 },
      { name: 'Shivamogga', lat: 13.9299, lon: 75.5681 }
    ],
    lightning: [
      [77.55, 13.02], [77.62, 12.90], [76.70, 12.35], [77.15, 13.38],
      [76.15, 13.05], [78.10, 13.18]
    ]
  },
  'All India Composite': {
    center: [78.9629, 21.5937],
    zoom: 4.8,
    bounds: { minLat: 8.0, maxLat: 34.0, minLon: 68.0, maxLon: 94.0 },
    mainLocation: { name: 'National Composite, India', lat: '21.5937', lon: '78.9629' },
    cities: [
      { name: 'New Delhi', lat: 28.6139, lon: 77.2090, isMain: true },
      { name: 'Mumbai', lat: 19.0760, lon: 72.8777, isMain: true },
      { name: 'Kolkata', lat: 22.5726, lon: 88.3639, isMain: true },
      { name: 'Chennai', lat: 13.0827, lon: 80.2707, isMain: true },
      { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, isMain: true },
      { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, isMain: true },
      { name: 'Bhubaneswar', lat: 20.2961, lon: 85.8245, isMain: true },
      { name: 'Guwahati', lat: 26.1445, lon: 91.7362, isMain: true }
    ],
    lightning: [
      [78.42, 17.48], [85.85, 20.35], [77.55, 13.02], [88.25, 22.60],
      [77.20, 28.65], [72.90, 19.10]
    ]
  }
};
