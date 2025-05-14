class MaxPriceCalculator {
            constructor() {
                this.form = document.getElementById('maxPriceCalculatorForm');
                this.results = document.getElementById('results');
                this.borrower2Section = document.getElementById('borrower2Details');
                this.calculateButton = document.getElementById('calculateButton');

                // Constants
                this.STRESS_TEST_RATE = 0.04; // 4% annual
                this.TDSR_LIMIT = 0.55; // 55%
                this.MSR_LIMIT = 0.3; // 30%
                this.NOA_FACTOR = 0.7; // 70%
                this.MAX_LOAN_PERCENTAGE = 0.75;
                this.MIN_CASH_PERCENTAGE = 0.05;
                this.CPF_CASH_PERCENTAGE = 0.2;
                this.MAX_AGE_LIMIT = 65;
                this.TENURE_PRIVATE = 30;
                this.TENURE_HDB = 25;

                // Label texts
                this.LABEL_TEXTS = {
                    employed: 'Annual Bonus',
                    selfEmployed: 'Annual Income'
                };

                // Track touched fields
                this.touchedFields = new Set();

                this.initializeFormState();
                this.initializeEventListeners();
                this.initializeNoaLabels();
                this.initializeCommaFormatting();
            }

            initializeFormState() {
                this.borrower2Section.classList.add('hidden');
                document.querySelectorAll('.error-message').forEach(error => {
                    error.style.display = 'none';
                });
                this.borrower2Section.querySelectorAll('input').forEach(input => {
                    input.required = false;
                });
                this.results.querySelectorAll('span').forEach(span => {
                    span.textContent = '-';
                });
                this.initializeHdbForeignerValidation();
            }

            initializeNoaLabels() {
                ['borrower1', 'borrower2'].forEach(borrower => {
                    this.updateNoaLabel(borrower);
                });
            }

            updateNoaLabel(borrower) {
                const employmentStatus = document.querySelector(`input[name="${borrower}EmploymentStatus"]:checked`)?.value;
                const noaLabel = document.getElementById(`${borrower}NoaLabel`);
                if (noaLabel && employmentStatus) {
                    noaLabel.textContent = this.LABEL_TEXTS[employmentStatus];
                }
            }

            initializeHdbForeignerValidation() {
                document.querySelectorAll('input[name="propertyType"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        const isRestricted = e.target.value === 'hdb' || e.target.value === 'ecNewLaunch';
                        this.updateForeignerOptions(isRestricted);
                    });
                });
                const selectedProperty = document.querySelector('input[name="propertyType"]:checked').value;
                this.updateForeignerOptions(selectedProperty === 'hdb' || selectedProperty === 'ecNewLaunch');
            }

            updateForeignerOptions(isHdb) {
                const foreignerOptions = document.querySelectorAll('input[name$="ResidencyStatus"][value="foreigner"]');
                foreignerOptions.forEach(option => {
                    if (isHdb) {
                        if (option.checked) {
                            const singaporeanOption = document.querySelector(`input[name="${option.name}"][value="singaporean"]`);
                            if (singaporeanOption) singaporeanOption.checked = true;
                        }
                        option.disabled = true;
                        option.parentElement.style.opacity = '0.5';
                    } else {
                        option.disabled = false;
                        option.parentElement.style.opacity = '1';
                    }
                });
            }

            initializeEventListeners() {
                // Borrower Count
                document.querySelectorAll('input[name="borrowerCount"]').forEach(radio => {
                    radio.addEventListener('change', () => {
                        this.toggleBorrower2Fields();
                    });
                });

                // Employment Status
                ['borrower1', 'borrower2'].forEach(borrower => {
                    document.querySelectorAll(`input[name="${borrower}EmploymentStatus"]`).forEach(radio => {
                        radio.addEventListener('change', (e) => {
                            this.toggleEmploymentFields(borrower, e.target.value);
                            this.updateNoaLabel(borrower);
                        });
                    });
                });

                // Input Validation
                this.form.querySelectorAll('input').forEach(input => {
                    input.addEventListener('focus', () => {
                        this.touchedFields.add(input.id);
                    });
                    input.addEventListener('input', () => {
                        if (this.touchedFields.has(input.id)) {
                            this.validateInput(input);
                        }
                    });
                    input.addEventListener('blur', () => {
                        this.touchedFields.add(input.id);
                        this.validateInput(input);
                    });
                });

                // Calculate Button
                this.calculateButton.addEventListener('click', () => {
                    if (this.validateForm()) {
                        this.calculateMaxPrice();
                    }
                });
            }

            toggleBorrower2Fields() {
                const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
                this.borrower2Section.classList.toggle('hidden', isSingle);
                const borrower1Title = document.querySelector('#borrower1Details h2');
                if (borrower1Title) {
                    borrower1Title.textContent = isSingle ? 'Income Details' : 'Borrower 1\'s Income Details';
                }
                this.borrower2Section.querySelectorAll('input').forEach(input => {
                    input.required = !isSingle;
                    if (isSingle) {
                        input.value = '';
                        input.classList.remove('error');
                        const errorElement = document.getElementById(`${input.id}Error`);
                        if (errorElement) errorElement.style.display = 'none';
                    }
                });
            }

            toggleEmploymentFields(borrower, status) {
                const basicSalaryGroup = document.getElementById(`${borrower}BasicSalaryGroup`);
                const noaGroup = document.getElementById(`${borrower}NoaGroup`);
                const basicSalaryInput = document.getElementById(`${borrower}BasicSalary`);
                const noaInput = document.getElementById(`${borrower}NOA`);
                if (status === 'employed') {
                    basicSalaryGroup.classList.remove('hidden');
                    noaGroup.classList.remove('hidden');
                    basicSalaryInput.required = true;
                    noaInput.required = false;
                } else {
                    basicSalaryGroup.classList.add('hidden');
                    noaGroup.classList.remove('hidden');
                    basicSalaryInput.required = false;
                    noaInput.required = true;
                    basicSalaryInput.value = '';
                }
            }

            validateInput(input) {
                if (!this.touchedFields.has(input.id)) return true;
                let isValid = true;
                let errorMessage = '';

                if (input.classList.contains('comma-input')) {
                    const value = this.parseNumber(input.value);
                    if (input.required && (isNaN(value) || input.value.trim() === '')) {
                        isValid = false;
                        errorMessage = 'This field is required';
                    } else if (!isNaN(value) && input.min && value < this.parseNumber(input.min)) {
                        isValid = false;
                        errorMessage = `Minimum value is ${input.min}`;
                    }
                } else {
                    isValid = input.checkValidity();
                    if (!isValid) {
                        if (input.validity.valueMissing) {
                            errorMessage = 'This field is required';
                        } else if (input.validity.rangeUnderflow) {
                            errorMessage = `Minimum value is ${input.min}`;
                        } else if (input.validity.rangeOverflow) {
                            errorMessage = `Maximum value is ${input.max}`;
                        } else {
                            errorMessage = input.validationMessage;
                        }
                    }
                }

                input.classList.toggle('error', !isValid);
                const errorElement = document.getElementById(`${input.id}Error`);
                if (errorElement) {
                    errorElement.textContent = errorMessage;
                    errorElement.style.display = isValid ? 'none' : 'block';
                }
                return isValid;
            }

            validateForm() {
                if (!this.form.checkValidity()) return false;
                let isValid = true;
                this.form.querySelectorAll('input:required').forEach(input => {
                    if (!this.isFieldVisible(input)) return;
                    if (this.touchedFields.has(input.id) && !this.validateInput(input)) {
                        isValid = false;
                    }
                });
                return isValid;
            }

            isFieldVisible(input) {
                let element = input;
                while (element && element !== this.form) {
                    if (element.classList.contains('hidden')) return false;
                    element = element.parentElement;
                }
                return true;
            }

            parseNumber(value) {
                if (!value) return 0;
                return parseFloat(value.replace(/,/g, '')) || 0;
            }

            formatNumberWithCommas(value) {
                value = value.replace(/[^0-9]/g, '');
                return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }

            initializeCommaFormatting() {
                const commaInputs = document.querySelectorAll('.comma-input');
                commaInputs.forEach(input => {
                    input.addEventListener('input', (e) => {
                        const cursorPosition = e.target.selectionStart;
                        const valueBefore = e.target.value;
                        const formattedValue = this.formatNumberWithCommas(e.target.value);
                        e.target.value = formattedValue;
                        const commasBeforeCursor = (valueBefore.slice(0, cursorPosition).match(/,/g) || []).length;
                        const newCommasBeforeCursor = (formattedValue.slice(0, cursorPosition).match(/,/g) || []).length;
                        const cursorAdjustment = newCommasBeforeCursor - commasBeforeCursor;
                        e.target.setSelectionRange(cursorPosition + cursorAdjustment, cursorPosition + cursorAdjustment);
                        this.validateInput(e.target);
                    });
                });
            }

            calculateBorrowerIncome(borrower) {
                const isEmployed = document.querySelector(`input[name="${borrower}EmploymentStatus"][value="employed"]`)?.checked;
                const basicSalary = this.parseNumber(document.getElementById(`${borrower}BasicSalary`)?.value) || 0;
                const noa = this.parseNumber(document.getElementById(`${borrower}NOA`)?.value) || 0;
                return isEmployed ? basicSalary + (noa * this.NOA_FACTOR / 12) : (noa * this.NOA_FACTOR / 12);
            }

            calculateTotalIncome() {
                const borrower1Income = this.calculateBorrowerIncome('borrower1');
                const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
                return isSingle ? borrower1Income : borrower1Income + this.calculateBorrowerIncome('borrower2');
            }

            calculateWeightedAverageAge() {
                const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
                const borrower1Age = parseInt(document.getElementById('borrower1Age').value) || 0;
                const borrower1Income = this.calculateBorrowerIncome('borrower1');
                if (isSingle) return borrower1Age;
                const borrower2Age = parseInt(document.getElementById('borrower2Age').value) || 0;
                const borrower2Income = this.calculateBorrowerIncome('borrower2');
                const totalIncome = borrower1Income + borrower2Income;
                return Math.ceil((borrower1Age * borrower1Income + borrower2Age * borrower2Income) / totalIncome);
            }

            calculateTotalCommitments() {
                const borrower1Commitments = this.parseNumber(document.getElementById('borrower1Commitments').value) || 0;
                const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
                const borrower2Commitments = isSingle ? 0 : this.parseNumber(document.getElementById('borrower2Commitments').value) || 0;
                return borrower1Commitments + borrower2Commitments;
            }

            calculateLoanTenure() {
                const propertyType = document.querySelector('input[name="propertyType"]:checked').value;
                const weightedAge = this.calculateWeightedAverageAge();
                const maxTenure = (propertyType === 'hdb') ? this.TENURE_HDB : this.TENURE_PRIVATE;
                return Math.min(this.MAX_AGE_LIMIT - weightedAge, maxTenure);
            }

            calculatePV(rate, nper, pmt) {
                const monthlyRate = rate / 12;
                return Math.abs(pmt) * (1 - Math.pow(1 + monthlyRate, -nper)) / monthlyRate;
            }

            calculateMaxPrice() {
                const totalIncome = this.calculateTotalIncome();
                const totalCommitments = this.calculateTotalCommitments();
                const propertyType = document.querySelector('input[name="propertyType"]:checked').value;
                const tenure = this.calculateLoanTenure();
                const cash = this.parseNumber(document.getElementById('cashOnHand').value) || 0;
                const cpf = this.parseNumber(document.getElementById('cpfOA').value) || 0;

                // Monthly Payment Capacity
                const tdsrAvailable = Math.max(totalIncome * this.TDSR_LIMIT - totalCommitments, 0);
                const msrAvailable = totalIncome * this.MSR_LIMIT;
                const monthlyPayment = (propertyType === 'hdb' || propertyType === 'ecNewLaunch') ? 
                                      Math.min(tdsrAvailable, msrAvailable) : tdsrAvailable;

                // Loan Eligibility
                const months = tenure * 12;
                const stressRate = this.STRESS_TEST_RATE / 12;
                const loanEligibility = this.calculatePV(this.STRESS_TEST_RATE, months, monthlyPayment);

                // Step 1: Calculate Max Price from Loan (Loan Eligibility is 75% of property price)
                const priceFromLoan = loanEligibility / this.MAX_LOAN_PERCENTAGE;

                // Step 2: Calculate Required Downpayment (25% of priceFromLoan)
                const downpaymentRequired = priceFromLoan * (1 - this.MAX_LOAN_PERCENTAGE);

                // Step 3: Calculate Balance Liquidity (Cash + CPF - Required Downpayment)
                const balanceLiquidity = Math.max((cash + cpf) - downpaymentRequired, 0);

                // Step 4: Final Max Property Price
                const maxPropertyPrice = priceFromLoan + balanceLiquidity;

                // Downpayment Breakdown (5% minimum cash, 20% CPF/cash)
                const minCashDownpayment = priceFromLoan * this.MIN_CASH_PERCENTAGE;
                const cpfCashDownpayment = priceFromLoan * this.CPF_CASH_PERCENTAGE;
                const finalLoan = loanEligibility;

                // Breakdown Percentages
                const cashContribution = maxPropertyPrice > 0 ? (cash / maxPropertyPrice) * 100 : 0;
                const cpfContribution = maxPropertyPrice > 0 ? (cpf / maxPropertyPrice) * 100 : 0;
                const loanContribution = maxPropertyPrice > 0 ? (loanEligibility / maxPropertyPrice) * 100 : 0;

                // Update Results
                const formatCurrency = (value) => `SGD ${Math.round(value).toLocaleString()}`;
                const formatPercentage = (value) => `${Math.round(value * 100)}%`;
                const formatContribution = (value, amount) => {
                    const formattedAmount = formatCurrency(amount);
                    const formattedPercentage = `${value.toFixed(2)}%`;
                    return `<span class="amount">${formattedAmount}</span><span class="percentage">(${formattedPercentage})</span>`;
                };

                document.getElementById('maxPropertyPrice').textContent = formatCurrency(maxPropertyPrice);
                document.getElementById('loanAmount').textContent = formatCurrency(finalLoan);
                document.getElementById('loanPercentage').textContent = formatPercentage(this.MAX_LOAN_PERCENTAGE);
                document.getElementById('cashDownpayment').textContent = formatCurrency(minCashDownpayment);
                document.getElementById('cashPercentage').textContent = formatPercentage(this.MIN_CASH_PERCENTAGE);
                document.getElementById('cpfDownpayment').textContent = formatCurrency(cpfCashDownpayment);
                document.getElementById('cpfPercentage').textContent = formatPercentage(this.CPF_CASH_PERCENTAGE);
                document.getElementById('balanceLiquidity').textContent = formatCurrency(balanceLiquidity);
                document.getElementById('cashContribution').innerHTML = formatContribution(cashContribution, cash);
                document.getElementById('cpfContribution').innerHTML = formatContribution(cpfContribution, cpf);
                document.getElementById('loanContribution').innerHTML = formatContribution(loanContribution, loanEligibility);
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new MaxPriceCalculator();
        });