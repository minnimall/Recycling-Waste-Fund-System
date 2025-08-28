    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });

    // Sample location data
    const locations = [
        {
            id: 1,
            name: 'ศาลากลางหมู่บ้าน',
            type: 'community',
            address: 'บ้านวังผือ ตำบล ขามป้อม อำเภอ เปือยน้อย ขอนแก่น 40340',
            lat: 15.915295183065169,
            lng: 102.87223057509956,
            hours: '09:00-17:00',
            phone: '02-123-4567',
            status: 'open',
            rating: 5,
            distance: '0.5 กม.',
            wasteTypes: ['กระดาษ', 'พลาสติก', 'โลหะ', 'แก้ว'],
            prices: {
                'กระดาษขาว': '5.00',
                'ขวด PET': '8.50',
                'อลูมิเนียม': '45.00',
                'ขวดแก้ว': '1.20'
            }
        },
        {
            id: 2,
            name: 'วัดชัยสวาส',
            type: 'mobile',
            address: 'หน้าวัดใหญ่ หมู่ 2',
            lat: 15.94863226840623,
            lng: 102.86921352915247,
            hours: '09:00-15:00',
            phone: '089-123-4567',
            status: 'open',
            rating: 4,
            distance: '1.2 กม.',
            wasteTypes: ['กระดาษ', 'พลาสติก', 'โลหะ'],
            prices: {
                'กระดาษขาว': '4.50',
                'ขวด PET': '8.00',
                'อลูมิเนียม': '43.00'
            }
        },
        {
            id: 3,
            name: 'วัดศรีชัยยาราม',
            type: 'community',
            address: 'หน้าวัดใหญ่ หมู่ 3',
            lat: 15.93903216388115,
            lng: 102.849701624319378,
            hours: '13:00-16:00',
            phone: '02-987-6543',
            status: 'closed',
            rating: 5,
            distance: '2.1 กม.',
            wasteTypes: ['กระดาษ', 'พลาสติก'],
            prices: {
                'กระดาษขาว': '4.80',
                'ขวด PET': '8.20'
            }
        },
        {
            id: 4,
            name: 'ศาลาอเนกประสงค์บ้านส้มป่อยน้อย',
            type: 'center',
            address: 'ตำบล ขามป้อม อำเภอ เปือยน้อย ขอนแก่น 40340',
            lat: 15.912481554817859,
            lng: 102.89443277892198,
            hours: '07:30-18:00',
            phone: '02-456-7890',
            status: 'open',
            rating: 4,
            distance: '3.5 กม.',
            wasteTypes: ['กระดาษ', 'พลาสติก', 'โลหะ', 'แก้ว', 'อิเล็กทรอนิกส์'],
            prices: {
                'กระดาษขาว': '5.20',
                'ขวด PET': '9.00',
                'อลูมิเนียม': '46.00',
                'ขวดแก้ว': '1.50'
            }
        }
    ];

    // Initialize map
    const map = L.map('map').setView([13.7563, 100.5018], 13);

    // Add tile layer
    let currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Custom icons
    const icons = {
        center: L.divIcon({
            html: '<i class="fas fa-building text-white"></i>',
            iconSize: [30, 30],
            className: 'custom-div-icon bg-green-500 rounded-full flex items-center justify-center'
        }),
        mobile: L.divIcon({
            html: '<i class="fas fa-truck text-white"></i>',
            iconSize: [30, 30],
            className: 'custom-div-icon bg-blue-500 rounded-full flex items-center justify-center'
        }),
        community: L.divIcon({
            html: '<i class="fas fa-users text-white"></i>',
            iconSize: [30, 30],
            className: 'custom-div-icon bg-purple-500 rounded-full flex items-center justify-center'
        }),
        user: L.divIcon({
            html: '<i class="fas fa-user text-white"></i>',
            iconSize: [25, 25],
            className: 'custom-div-icon bg-red-500 rounded-full flex items-center justify-center'
        })
    };

    // Add markers to map
    const markers = [];
    locations.forEach(location => {
        const marker = L.marker([location.lat, location.lng], {
            icon: icons[location.type]
        }).addTo(map);

        const popupContent = `
            <div class="p-2">
                <h4 class="font-semibold text-gray-800 mb-2">${location.name}</h4>
                <p class="text-sm text-gray-600 mb-1">${location.address}</p>
                <p class="text-sm text-gray-600 mb-2">
                    <i class="fas fa-clock mr-1"></i>${location.hours}
                </p>
                <div class="flex items-center mb-2">
                    <span class="bg-${location.status === 'open' ? 'green' : 'red'}-100 text-${location.status === 'open' ? 'green' : 'red'}-800 px-2 py-1 rounded-full text-xs">
                        ${location.status === 'open' ? 'เปิด' : 'ปิด'}
                    </span>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        markers.push({ marker, location });
    });

    // Filter functionality
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            
            // Update active button
            filterBtns.forEach(b => {
                b.classList.remove('bg-primary', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
            });
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            btn.classList.add('bg-primary', 'text-white');
            
            // Filter markers
            markers.forEach(({ marker, location }) => {
                if (filter === 'all' || location.type === filter) {
                    marker.addTo(map);
                } else {
                    map.removeLayer(marker);
                }
            });
            
            // Filter sidebar list
            filterLocationList(filter);
        });
    });

    // Filter location list
    function filterLocationList(filter) {
        const locationItems = document.querySelectorAll('.location-item');
        locationItems.forEach(item => {
            const locationId = parseInt(item.dataset.id);
            const location = locations.find(l => l.id === locationId);
            
            if (filter === 'all' || location.type === filter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Location item click
    document.querySelectorAll('.location-item').forEach(item => {
        item.addEventListener('click', () => {
            const locationId = parseInt(item.dataset.id);
            const location = locations.find(l => l.id === locationId);
            
            // Center map on location
            map.setView([location.lat, location.lng], 16);
            
            // Open popup
            const marker = markers.find(m => m.location.id === locationId);
            if (marker) {
                marker.marker.openPopup();
            }
        });
    });

    // Locate user
    document.getElementById('locate-me').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Add user marker
                    const userMarker = L.marker([lat, lng], {
                        icon: icons.user
                    }).addTo(map);
                    
                    userMarker.bindPopup('<div class="p-2"><h4 class="font-semibold">ตำแหน่งของคุณ</h4></div>');
                    
                    // Center map on user location
                    map.setView([lat, lng], 15);
                },
                (error) => {
                    alert('ไม่สามารถระบุตำแหน่งของคุณได้');
                }
            );
        } else {
            alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
        }
    });

    // Map view toggle
    document.getElementById('satellite-view-btn').addEventListener('click', () => {
        map.removeLayer(currentTileLayer);
        currentTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri'
        }).addTo(map);
        
        document.getElementById('map-view-btn').classList.remove('bg-primary', 'text-white');
        document.getElementById('map-view-btn').classList.add('bg-gray-200', 'text-gray-700');
        document.getElementById('satellite-view-btn').classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('satellite-view-btn').classList.add('bg-primary', 'text-white');
    });

    document.getElementById('map-view-btn').addEventListener('click', () => {
        map.removeLayer(currentTileLayer);
        currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        document.getElementById('satellite-view-btn').classList.remove('bg-primary', 'text-white');
        document.getElementById('satellite-view-btn').classList.add('bg-gray-200', 'text-gray-700');
        document.getElementById('map-view-btn').classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('map-view-btn').classList.add('bg-primary', 'text-white');
    });

    // Show location details modal
    function showLocationDetails(locationId) {
        const location = locations.find(l => l.id === locationId);
        if (!location) return;

        document.getElementById('modal-title').textContent = location.name;
        
        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = `
            <div class="space-y-6">
                <!-- Basic Info -->
                <div>
                    <h4 class="font-semibold text-gray-800 mb-3">ข้อมูลทั่วไป</h4>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-600 mb-1">ที่อยู่:</p>
                            <p class="font-medium">${location.address}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600 mb-1">เบอร์โทร:</p>
                            <p class="font-medium">${location.phone}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600 mb-1">เวลาทำการ:</p>
                            <p class="font-medium">${location.hours}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600 mb-1">สถานะ:</p>
                            <span class="bg-${location.status === 'open' ? 'green' : 'red'}-100 text-${location.status === 'open' ? 'green' : 'red'}-800 px-2 py-1 rounded-full text-sm">
                                ${location.status === 'open' ? 'เปิดให้บริการ' : 'ปิดให้บริการ'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Waste Types -->
                <div>
                    <h4 class="font-semibold text-gray-800 mb-3">ประเภทขยะที่รับซื้อ</h4>
                    <div class="flex flex-wrap gap-2">
                        ${location.wasteTypes.map(type => `
                            <span class="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">${type}</span>
                        `).join('')}
                    </div>
                </div>

                <!-- Prices -->
                <div>
                    <h4 class="font-semibold text-gray-800 mb-3">ราคารับซื้อ (บาท/กิโลกรัม)</h4>
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="grid md:grid-cols-2 gap-3">
                            ${Object.entries(location.prices).map(([type, price]) => `
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">${type}:</span>
                                    <span class="font-semibold text-primary">${price} บาท</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Rating -->
                <div>
                    <h4 class="font-semibold text-gray-800 mb-3">คะแนนรีวิว</h4>
                    <div class="flex items-center space-x-2">
                        <div class="flex text-yellow-400">
                            ${Array(5).fill().map((_, i) => `
                                <i class="fas fa-star${i < location.rating ? '' : ' opacity-30'}"></i>
                            `).join('')}
                        </div>
                        <span class="text-gray-600">(${location.rating}/5)</span>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex space-x-3 pt-4">
                    <button class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                        <i class="fas fa-directions mr-2"></i>นำทาง
                    </button>
                    <button class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                        <i class="fas fa-phone mr-2"></i>โทร
                    </button>
                    <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        <i class="fas fa-share mr-2"></i>แชร์
                    </button>
                </div>
            </div>
        `;

        document.getElementById('location-modal').classList.remove('hidden');
    }

    // Close modal
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('location-modal').classList.add('hidden');
    });

    document.getElementById('location-modal').addEventListener('click', (e) => {
        if (e.target.id === 'location-modal') {
            document.getElementById('location-modal').classList.add('hidden');
        }
    });

    // Search functionality
    document.getElementById('search-location').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const locationItems = document.querySelectorAll('.location-item');
        
        locationItems.forEach(item => {
            const locationId = parseInt(item.dataset.id);
            const location = locations.find(l => l.id === locationId);
            const text = (location.name + ' ' + location.address).toLowerCase();
            
            if (text.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }); 