document.addEventListener('DOMContentLoaded', () => {
    // --- VANTA.JS BACKGROUND INITIALIZATION ---
    let vantaEffect = null; // To hold the Vanta instance
    try {
        vantaEffect = VANTA.WAVES({
            el: "#vanta-bg",
            mouseControls: false,
            touchControls: false,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0x005aaa, // A color that fits the blue theme
            shininess: 25.00,
            waveHeight: 15.00,
            waveSpeed: 0.75,
            zoom: 0.90
        });
    } catch (e) {
        console.error("Vanta.js initialization failed: ", e);
        // Hide the background element if Vanta fails
        const vantaBg = document.getElementById('vanta-bg');
        if(vantaBg) vantaBg.style.display = 'none';
    }

    // Cleanup Vanta on page unload to free up resources
    window.addEventListener('beforeunload', () => {
        if (vantaEffect) {
            vantaEffect.destroy();
        }
    });

    // --- LOADER HIDING LOGIC ---
    const loader = document.getElementById('loader-wrapper');
    window.addEventListener('load', () => {
        loader.classList.add('hidden');
    });

    // --- SIDEBAR SLIDE-IN TRIGGER ---
    document.body.classList.add('loaded');

    // --- INITIALIZE AOS ---
    if (window.AOS) {
        AOS.init({
            once: true, // Whether animation should happen only once - while scrolling down
            duration: 600, // values from 0 to 3000, with step 50ms
        });
    }

    // --- DOM ELEMENT REFERENCES ---
    const mainContent = document.getElementById('mainContent');
    const sidebarNav = document.querySelector('.sidebar-nav');
    const sidebarFooter = document.querySelector('.sidebar-footer');
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const logoutBtn = document.getElementById('logoutBtn');
    const themeSwitcher = document.getElementById('themeSwitcher');

    // --- TEMPLATE REFERENCES ---
    const templates = {
        dashboard: document.getElementById('dashboardTemplate'),
        newRegistration: document.getElementById('newRegistrationTemplate'),
        assetInventory: document.getElementById('assetInventoryTemplate'),
        previewRegistration: document.getElementById('previewRegistrationTemplate'),
        newIssue: document.getElementById('newIssueTemplate'),
        existingIssues: document.getElementById('existingIssuesTemplate'),
        previewIssue: document.getElementById('previewIssueTemplate'),
        reports: document.getElementById('reportsTemplate'),
        account: document.getElementById('accountTemplate'),
        assetTransfer: document.getElementById('assetTransferTemplate'),
    };

    // --- STATE MANAGEMENT ---
    let currentView = 'dashboard';
    let allIssuedAssets = [];
    let allRegisteredAssets = [];
    let reportData = [];
    let currentFormData = {};
    let assetPieChart = null; // To hold the chart instance

    // --- THEME LOGIC ---
    const applyTheme = (theme) => {
        document.body.dataset.theme = theme;
        localStorage.setItem('assetManagementTheme', theme);
        themeSwitcher.value = theme;
    };
    themeSwitcher.addEventListener('change', (e) => applyTheme(e.target.value));

    // --- NAVIGATION HANDLING ---
    const switchView = (view, data = null) => {
        if (!view) return;
        currentView = view;
        currentFormData = data || currentFormData;
        updateActiveLink(view);
        render();
        if (window.innerWidth <= 992) {
            document.body.classList.remove('sidebar-visible');
        }
    };

    const updateActiveLink = (view) => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`.nav-link[data-view="${view}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            const parentGroup = activeLink.closest('.nav-item-group');
            if (parentGroup && !parentGroup.classList.contains('open')) {
                parentGroup.classList.add('open');
            }
        }
    };

    sidebarNav.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        if (link.classList.contains('nav-link-group')) {
            e.preventDefault();
            link.closest('.nav-item-group').classList.toggle('open');
            return;
        }
        if (link.classList.contains('nav-link')) {
            e.preventDefault();
            switchView(link.dataset.view);
        }
    });

    sidebarFooter.addEventListener('click', (e) => {
        const link = e.target.closest('a.nav-link');
        if (link && link.dataset.view) {
            e.preventDefault();
            if (link.dataset.view === 'account') {
                switchView(link.dataset.view);
            }
        }
    });

    // --- RENDER FUNCTION ---
    const render = () => {
        // Start by fading the content out
        mainContent.classList.add('fade-out');
    
        // Wait for the fade-out transition to finish
        setTimeout(() => {
            mainContent.innerHTML = ''; // Clear content
            const template = templates[currentView];
            if (template) {
                mainContent.appendChild(template.content.cloneNode(true));
                addEventListenersForView(currentView);
            } else {
                mainContent.innerHTML = `<h2>View '${currentView}' not found.</h2>`;
            }
            
            // Remove fade-out class to fade content back in
            mainContent.classList.remove('fade-out');
            
            // Re-initialize AOS for the new content
            if (window.AOS) {
                AOS.init({
                    once: true,
                    duration: 600,
                });
            }
        }, 300); // This duration should match the transition time in your CSS
    };
    
    // --- MOBILE SIDEBAR TOGGLE ---
    mobileMenuButton.addEventListener('click', () => document.body.classList.toggle('sidebar-visible'));
    sidebarOverlay.addEventListener('click', () => document.body.classList.remove('sidebar-visible'));

    // --- LOGOUT ---
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('assetManagementTheme');
        window.location.href = '/';
    });
    
    // --- EVENT LISTENERS DISPATCHER ---
    const addEventListenersForView = (view) => {
        switch (view) {
            case 'dashboard': loadDashboardStats(); loadPieChartData(); break;
            case 'newRegistration': setupNewRegistrationForm(); break;
            case 'assetInventory': loadAssetInventory(); break;
            case 'previewRegistration': setupPreviewRegistrationForm(currentFormData); break;
            case 'newIssue': setupAssetForm(currentFormData); currentFormData = {}; break;
            case 'existingIssues': loadExistingIssues(); break;
            case 'previewIssue': setupPreviewIssueForm(currentFormData); break;
            case 'reports': setupReports(); break;
            case 'account': setupAccountForm(); break;
            case 'assetTransfer': setupAssetTransferForm(); break;
        }
    };

    // --- VIEW-SPECIFIC LOGIC FUNCTIONS ---
    
    const setupAccountForm = () => {
        const form = document.getElementById('accountForm');
        const messageDiv = document.getElementById('accountFormMessage');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.className = 'message';
            messageDiv.textContent = '';
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            if (!data.password) {
                delete data.password;
            }

            try {
                const response = await fetch('/api/account', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                messageDiv.textContent = result.message;
                messageDiv.className = response.ok ? 'message success' : 'message error';
            } catch (error) {
                console.error('Account update error:', error);
                messageDiv.textContent = 'An error occurred while updating the account.';
                messageDiv.className = 'message error';
            }
        });
    };

    const loadDashboardStats = async () => {
        try {
            const response = await fetch('/api/dashboard-stats');
            const data = await response.json();
            const pivot = {};
            const departments = new Set(['IT Stock']);
            const devices = new Set();
            data.forEach(item => {
                devices.add(item.device);
                departments.add(item.department);
                if (!pivot[item.device]) pivot[item.device] = {};
                pivot[item.device][item.department] = item.count;
            });
            const sortedDepartments = Array.from(departments).sort((a, b) => {
                if (a === 'IT Stock') return 1;
                if (b === 'IT Stock') return -1;
                return a.localeCompare(b);
            });
            const table = document.getElementById('assetDistributionTable');
            const thead = table.querySelector('thead');
            thead.innerHTML = `<tr><th>Device</th>${sortedDepartments.map(d => `<th>${d}</th>`).join('')}<th>Total</th></tr>`;
            let totalIssued = 0;
            let totalAvailable = 0;
            const tbody = table.querySelector('tbody');
            tbody.innerHTML = '';
            const grandTotals = { total: 0 };
            sortedDepartments.forEach(dept => grandTotals[dept] = 0);
            devices.forEach(device => {
                let rowTotal = 0;
                const row = document.createElement('tr');
                let rowHTML = `<td>${device}</td>`;
                sortedDepartments.forEach(dept => {
                    const count = pivot[device][dept] || 0;
                    rowHTML += `<td>${count}</td>`;
                    rowTotal += count;
                    grandTotals[dept] += count;
                    if (dept === 'IT Stock') totalAvailable += count; else totalIssued += count;
                });
                rowHTML += `<td>${rowTotal}</td>`;
                row.innerHTML = rowHTML;
                tbody.appendChild(row);
                grandTotals.total += rowTotal;
            });
            const footerRow = document.createElement('tr');
            footerRow.className = 'grand-total-row';
            let footerHTML = `<td><strong>Total</strong></td>`;
            sortedDepartments.forEach(dept => footerHTML += `<td><strong>${grandTotals[dept]}</strong></td>`);
            footerHTML += `<td><strong>${grandTotals.total}</strong></td>`;
            footerRow.innerHTML = footerHTML;
            tbody.appendChild(footerRow);
            document.getElementById('issuedAssets').textContent = totalIssued;
            document.getElementById('availableAssets').textContent = totalAvailable;
            document.getElementById('totalAssets').textContent = totalIssued + totalAvailable;
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            const container = document.querySelector('.stats-table-container');
            if (container) container.innerHTML = '<p>Error loading dashboard data.</p>';
        }
    };

    const loadPieChartData = async () => {
        try {
            const response = await fetch('/api/asset-distribution');
            const data = await response.json();
            
            const labels = data.map(item => item.category);
            const counts = data.map(item => item.count);

            renderPieChart(labels, counts);

        } catch (error) {
            console.error('Failed to load pie chart data:', error);
            const chartContainer = document.querySelector('.chart-container');
            if(chartContainer) chartContainer.innerHTML = '<p>Error loading chart data.</p>';
        }
    };

    const renderPieChart = (labels, data) => {
        const ctx = document.getElementById('assetPieChart').getContext('2d');
        if (assetPieChart) {
            assetPieChart.destroy();
        }
        assetPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Asset Distribution',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(199, 199, 199, 0.8)',
                        'rgba(83, 102, 255, 0.8)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)',
                        'rgba(83, 102, 255, 1)',
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false,
                        text: 'Asset Distribution by Category'
                    }
                }
            }
        });
    };

    const setupNewRegistrationForm = () => {
        const form = document.getElementById('newRegistrationForm');
        const messageDiv = document.getElementById('registrationFormMessage');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            try {
                const response = await fetch('/api/register-asset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                messageDiv.textContent = result.message;
                messageDiv.className = response.ok ? 'message success' : 'message error';
                if (response.ok) form.reset();
            } catch (error) {
                console.error('Registration submission error:', error);
                messageDiv.textContent = 'An error occurred during registration.';
                messageDiv.className = 'message error';
            }
        });
        form.querySelector('.btn-secondary').addEventListener('click', () => { form.reset(); messageDiv.className = 'message'; messageDiv.textContent = ''; });
    };

    const loadAssetInventory = async () => {
        try {
            const [regResponse, issuedResponse] = await Promise.all([fetch('/api/registered-assets'), fetch('/api/assets')]);
            allRegisteredAssets = await regResponse.json();
            allIssuedAssets = await issuedResponse.json();
            const issuedSerialNumbers = new Set(allIssuedAssets.map(asset => asset.serial_number));
            const tableBody = document.querySelector('#inventoryTable tbody');
            tableBody.innerHTML = '';
            if (allRegisteredAssets.length === 0) { tableBody.innerHTML = '<tr><td colspan="7">No assets registered yet.</td></tr>'; return; }
            allRegisteredAssets.forEach(asset => {
                const isIssued = issuedSerialNumbers.has(asset.asset_serial_no);
                const status = isIssued ? '<span class="status-issued">Issued</span>' : '<span class="status-available">Available</span>';
                const warrantyEnd = asset.warranty_end_date ? new Date(asset.warranty_end_date).toLocaleDateString() : 'N/A';
                const row = document.createElement('tr');
                row.innerHTML = `<td>${asset.asset_serial_no}</td><td>${asset.asset_make || '-'}</td><td>${asset.asset_model || '-'}</td><td>${asset.vendor || '-'}</td><td>${warrantyEnd}</td><td>${status}</td><td class="actions-cell"><button class="btn btn-secondary preview-reg-btn" data-id="${asset.id}">Preview</button></td>`;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('.preview-reg-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const assetData = allRegisteredAssets.find(a => a.id == e.target.dataset.id);
                    if (assetData) switchView('previewRegistration', assetData);
                });
            });
        } catch (error) {
            console.error('Failed to load asset inventory:', error);
            document.querySelector('#inventoryTable tbody').innerHTML = '<tr><td colspan="7">Error loading data.</td></tr>';
        }
    };

    const setupPreviewRegistrationForm = (assetData) => {
        const previewForm = document.getElementById('previewRegistrationForm');
        if (!assetData) return;
        for (const key in assetData) {
            if (previewForm.elements[key]) {
                const isDate = key.includes('date') && assetData[key];
                previewForm.elements[key].value = isDate ? assetData[key].split('T')[0] : assetData[key] || '';
            }
        }
    };

    const setupAssetForm = (assetToEdit = null) => {
        const assetForm = document.getElementById('assetForm');
        if (!assetForm) return;
        const formTitle = document.getElementById('formTitle');
        const submitBtn = document.getElementById('submitBtn');
        const formMessage = document.getElementById('formMessage');

        if (assetToEdit && Object.keys(assetToEdit).length > 0) {
            formTitle.textContent = 'Edit Asset Issue';
            submitBtn.textContent = 'Update';
            for (const key in assetToEdit) { if (assetForm.elements[key]) assetForm.elements[key].value = assetToEdit[key] || ''; }
        } else {
            const dateInput = assetForm.querySelector('[name="issue_date_manual"]');
            if (dateInput) dateInput.value = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        }

        assetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(assetForm);
            const data = Object.fromEntries(formData.entries());
            const assetId = data.id;
            if (!assetId) delete data.id;
            const url = assetId ? `/api/assets/${assetId}` : '/api/assets';
            const method = assetId ? 'PUT' : 'POST';
            try {
                const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                formMessage.textContent = result.message;
                formMessage.className = response.ok ? 'message success' : 'message error';
                if (response.ok) {
                    assetForm.reset();
                    setTimeout(() => switchView('existingIssues'), 1500);
                }
            } catch (error) {
                console.error('Form submission error:', error);
                formMessage.textContent = 'An error occurred.';
                formMessage.className = 'message error';
            }
        });

        document.getElementById('clearBtn').addEventListener('click', () => { assetForm.reset(); formMessage.className = 'message'; });
        document.getElementById('downloadDocxBtn').addEventListener('click', () => generateHandoverDocument(assetForm));
    };

    const generateHandoverDocument = async (form) => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/generate-handover-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `Handover_Form_${data.employee_name || 'user'}.docx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                alert('Error generating document. Please try again.');
            }
        } catch (error) {
            console.error('Error downloading document:', error);
            alert('An error occurred while trying to download the document.');
        }
    };

    const loadExistingIssues = async () => {
        try {
            const response = await fetch('/api/assets');
            allIssuedAssets = await response.json();
            const tableBody = document.querySelector('#issuesTable tbody');
            tableBody.innerHTML = '';
            if (allIssuedAssets.length === 0) { tableBody.innerHTML = '<tr><td colspan="7">No asset issues found.</td></tr>'; return; }
            allIssuedAssets.forEach(asset => {
                const row = document.createElement('tr');
                const displayDate = asset.issue_date_manual || new Date(asset.created_at).toLocaleDateString();
                row.innerHTML = `<td>${asset.employee_code}</td><td>${asset.employee_name}</td><td>${asset.department}</td><td>${asset.asset_type}</td><td>${asset.serial_number}</td><td>${displayDate}</td><td class="actions-cell"><button class="btn btn-secondary preview-issue-btn" data-id="${asset.id}">Preview</button></td>`;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('.preview-issue-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const assetData = allIssuedAssets.find(a => a.id == e.target.dataset.id);
                    if (assetData) switchView('previewIssue', assetData);
                });
            });
        } catch (error) {
            console.error('Failed to load assets:', error);
            document.querySelector('#issuesTable tbody').innerHTML = '<tr><td colspan="7">Error loading data.</td></tr>';
        }
    };

    const setupPreviewIssueForm = (assetData) => {
        const previewForm = document.getElementById('previewForm');
        if (!assetData) return;
        for (const key in assetData) {
            if (previewForm.elements[key]) previewForm.elements[key].value = assetData[key] || '';
        }
        document.getElementById('downloadPreviewDocxBtn').addEventListener('click', () => generateHandoverDocument(previewForm));
    };

    const setupAssetTransferForm = () => {
        const form = document.getElementById('assetTransferForm');
        const searchInput = document.getElementById('transferEmployeeSearch');
        const messageDiv = document.getElementById('transferFormMessage');
        let searchTimeout;

        const clearFromFields = () => {
            const fromFields = form.querySelectorAll('[name$="_from"]');
            fromFields.forEach(field => field.value = '');
            form.elements['asset_issue_id'].value = '';
        };
        
        const clearToAndConfigFields = () => {
            const toAndConfigFields = form.querySelectorAll('[name$="_to"], .configuration-section [name]');
            toAndConfigFields.forEach(field => {
                if (field.tagName === 'SELECT') {
                    field.selectedIndex = 0;
                } else {
                    field.value = '';
                }
            });
        };

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const searchTerm = searchInput.value;
            if (searchTerm.length < 3) {
                clearFromFields();
                return;
            }
            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/asset-by-employee?searchTerm=${encodeURIComponent(searchTerm)}`);
                    const result = await response.json();
                    if (response.ok && result.success) {
                        const asset = result.data;
                        form.elements['asset_issue_id'].value = asset.id;
                        form.elements['employee_name_from'].value = asset.employee_name || '';
                        form.elements['employee_code_from'].value = asset.employee_code || '';
                        form.elements['department_from'].value = asset.department || '';
                        form.elements['designation_from'].value = asset.designation || '';
                        form.elements['location_from'].value = asset.location || '';
                        form.elements['phone_number_from'].value = asset.phone_number || '';
                        form.elements['email_id_from'].value = asset.email_id || '';
                        form.elements['hod_name_from'].value = asset.hod_name || '';
                        form.elements['asset_type_from'].value = asset.asset_type || '';
                        form.elements['asset_code_from'].value = asset.asset_code || '';
                        form.elements['make_model_from'].value = asset.make_model || '';
                        form.elements['serial_number_from'].value = asset.serial_number || '';
                        form.elements['ip_address_from'].value = asset.ip_address || '';
                        form.elements['hostname_from'].value = asset.hostname || '';
                        form.elements['old_laptop_serial_from'].value = asset.old_laptop_serial || '';
                        messageDiv.className = 'message';
                        messageDiv.textContent = '';
                    } else {
                        clearFromFields();
                        messageDiv.textContent = result.message || 'No asset found for this employee.';
                        messageDiv.className = 'message error';
                    }
                } catch (error) {
                    console.error('Error fetching asset for transfer:', error);
                    clearFromFields();
                    messageDiv.textContent = 'Error searching for employee.';
                    messageDiv.className = 'message error';
                }
            }, 500);
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Add previous employee code for audit purposes
            data.previous_employee_code = form.elements['employee_code_from'].value;

            if (!data.asset_issue_id) {
                messageDiv.textContent = 'Please select an asset to transfer by searching for an employee.';
                messageDiv.className = 'message error';
                return;
            }

            try {
                const response = await fetch('/api/transfer-asset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                messageDiv.textContent = result.message;
                messageDiv.className = response.ok ? 'message success' : 'message error';
                if (response.ok) {
                    form.reset();
                }
            } catch (error) {
                console.error('Asset transfer error:', error);
                messageDiv.textContent = 'An error occurred during the transfer.';
                messageDiv.className = 'message error';
            }
        });

        document.getElementById('clearTransferFormBtn').addEventListener('click', () => {
            form.reset();
            messageDiv.className = 'message';
            messageDiv.textContent = '';
        });
    };

    const setupReports = () => {
        document.getElementById('generateReportBtn').addEventListener('click', generateReport);
        document.getElementById('printReportBtn').addEventListener('click', () => window.print());
        document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
        document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    };

    const generateReport = async () => {
        const startDate = document.getElementById('startDateFilter').value;
        const endDate = document.getElementById('endDateFilter').value;
        const department = document.getElementById('departmentFilter').value;
        const user = document.getElementById('userFilter').value;
        const query = new URLSearchParams({ startDate, endDate, department, user }).toString();
        try {
            const response = await fetch(`/api/reports?${query}`);
            reportData = await response.json();
            renderReportTable(reportData);
            document.getElementById('reportActions').style.display = reportData.length > 0 ? 'flex' : 'none';
        } catch (error) {
            console.error('Error generating report:', error);
            document.getElementById('reportResultContainer').innerHTML = '<p>Error fetching report data.</p>';
        }
    };

    const renderReportTable = (data) => {
        const container = document.getElementById('reportResultContainer');
        container.innerHTML = '';
        if (data.length === 0) { container.innerHTML = '<p>No records match the filter criteria.</p>'; return; }
        const table = document.createElement('table');
        table.id = 'reportTable';
        table.innerHTML = `<thead><tr><th>Date</th><th>Emp Code</th><th>Name</th><th>Department</th><th>Asset Type</th><th>Serial No.</th><th>Hostname</th></tr></thead><tbody>
                ${data.map(row => {
                    const displayDate = row.issue_date_manual || new Date(row.created_at).toLocaleDateString();
                    return `<tr><td>${displayDate}</td><td>${row.employee_code}</td><td>${row.employee_name}</td><td>${row.department}</td><td>${row.asset_type}</td><td>${row.serial_number}</td><td>${row.hostname}</td></tr>`;
                }).join('')}</tbody>`;
        container.appendChild(table);
    };

    const exportToPDF = () => {
        if (reportData.length === 0) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.autoTable({ html: '#reportTable', startY: 20, headStyles: { fillColor: [0, 86, 179] }, didDrawPage: data => doc.text("Greenfuel Asset Report", 14, 15) });
        doc.save('asset_report.pdf');
    };
    
    const exportToExcel = () => {
        if (reportData.length === 0) return;
        const ws = XLSX.utils.table_to_sheet(document.getElementById('reportTable'));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Asset Report");
        XLSX.writeFile(wb, "asset_report.xlsx");
    };

    // --- INITIALIZE THE APP ---
    applyTheme(localStorage.getItem('assetManagementTheme') || 'blue');
    switchView('dashboard');
});
