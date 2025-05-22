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

        // Property type flags
        this.PROPERTY_TYPES = {
            privateCompleted: { canUseCpfForStampDuty: false },
            privateNewLaunch: { canUseCpfForStampDuty: true },
            hdb: { canUseCpfForStampDuty: true },
            ecNewLaunch: { canUseCpfForStampDuty: true }
        };

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

    // Stamp Duty Calculation Functions
    calculateBSD(value) {
        let bsd = 0;
        if (value <= 180000) return value * 0.01;
        bsd += 180000 * 0.01;
        value -= 180000;
        if (value <= 180000) return bsd + value * 0.02;
        bsd += 180000 * 0.02;
        value -= 180000;
        if (value <= 640000) return bsd + value * 0.03;
        bsd += 640000 * 0.03;
        value -= 640000;
        if (value <= 500000) return bsd + value * 0.04;
        bsd += 500000 * 0.04;
        value -= 500000;
        if (value <= 1500000) return bsd + value * 0.05;
        bsd += 1500000 * 0.05;
        value -= 1500000;
        return bsd + value * 0.06;
    }

    calculateABSD(value, residency) {
        switch (residency) {
            case 'Singaporean': return 0;
            case 'PR': return value * 0.05;
            case 'Foreigner': return value * 0.60;
            default: return 0;
        }
    }

    // Map HTML residency values to calculateABSD expected values
    mapResidencyStatus(htmlValue) {
        switch (htmlValue) {
            case 'singaporean': return 'Singaporean';
            case 'permanentResident': return 'PR';
            case 'foreigner': return 'Foreigner';
            default: return 'Singaporean';
        }
    }

    // Determine the highest ABSD rate based on residency
    getHighestABSDRate() {
        const borrower1Residency = this.mapResidencyStatus(
            document.querySelector('input[name="borrower1ResidencyStatus"]:checked')?.value || 'singaporean'
        );
        const isSingle = document.querySelector('input[name="borrowerCount"][value="single"]').checked;
        const borrower2Residency = isSingle
            ? 'Singaporean'
            : this.mapResidencyStatus(
                  document.querySelector('input[name="borrower2ResidencyStatus"]:checked')?.value || 'singaporean'
              );

        const residencyPriority = {
            'Foreigner': 3,
            'PR': 2,
            'Singaporean': 1
        };

        return residencyPriority[borrower1Residency] >= residencyPriority[borrower2Residency]
            ? borrower1Residency
            : borrower2Residency;
    }

    initializeFormState() {
        this.borrower2Section.classList.add('hidden');
        document.querySelectorAll('.error-message').forEach(error => {
            error.style.display = 'none';
        });
        this.borrower2Section.querySelectorAll('input').forEach(input => {
            input.required = false;
        });
        this.results.querySelectorAll('.value').forEach(element => {
            element.textContent = '-';
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
        document.querySelectorAll('input[name="borrowerCount"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleBorrower2Fields();
            });
        });

        ['borrower1', 'borrower2'].forEach(borrower => {
            document.querySelectorAll(`input[name="${borrower}EmploymentStatus"]`).forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.toggleEmploymentFields(borrower, e.target.value);
                    this.updateNoaLabel(borrower);
                });
            });
        });

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
        // Validate Foreigner restriction for HDB/EC
        const propertyType = document.querySelector('input[name="propertyType"]:checked').value;
        const highestResidency = this.getHighestABSDRate();
        if ((propertyType === 'hdb' || propertyType === 'ecNewLaunch') && highestResidency === 'Foreigner') {
            alert('Foreigners are not eligible for HDB or EC properties.');
            isValid = false;
        }
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
        const totalLiquidity = cash + cpf;

        // Monthly Payment Capacity
        const tdsrAvailable = Math.max(totalIncome * this.TDSR_LIMIT - totalCommitments, 0);
        const msrAvailable = totalIncome * this.MSR_LIMIT;
        const monthlyPayment = (propertyType === 'hdb' || propertyType === 'ecNewLaunch') 
            ? Math.min(tdsrAvailable, msrAvailable) 
            : tdsrAvailable;

        // Loan Eligibility
        const months = tenure * 12;
        const actualLoanEligibility = this.calculatePV(this.STRESS_TEST_RATE, months, monthlyPayment);
        const priceFromLoan = actualLoanEligibility / this.MAX_LOAN_PERCENTAGE;

        const canUseCpfForStampDuty = this.PROPERTY_TYPES[propertyType].canUseCpfForStampDuty;
        const highestResidency = this.getHighestABSDRate();
        const absdRate = highestResidency === 'Foreigner' ? 0.60 : highestResidency === 'PR' ? 0.05 : 0;

        // Calculate maximum price affordable by liquidity (stamp duty + downpayment)
        let maxPriceByLiquidity = 0;
        const maxStampDuty = canUseCpfForStampDuty ? totalLiquidity : cash;
        // Solve: price + BSD(price) + absdRate * price + 0.25 * price ≤ cash + cpf
        // Approximate BSD as 4% for high prices
        const totalMultiplier = 1 + absdRate + 0.04 + (canUseCpfForStampDuty ? 0.25 : 0.25);
        maxPriceByLiquidity = totalLiquidity / totalMultiplier;
        // Refine with binary search for stamp duty only
        let low = 0;
        let high = maxPriceByLiquidity * 2;
        for (let i = 0; i < 15; i++) {
            const mid = (low + high) / 2;
            const bsd = this.calculateBSD(mid);
            const absd = this.calculateABSD(mid, highestResidency);
            const totalStampDuty = bsd + absd;
            if (totalStampDuty <= maxStampDuty) {
                maxPriceByLiquidity = mid;
                low = mid;
            } else {
                high = mid;
            }
            if (high - low < 1) break;
        }

        // Binary search for feasible price including downpayment
        let maxPropertyPrice = 0;
        let adjustedCash = cash;
        let adjustedCPF = cpf;
        let bsd = 0;
        let absd = 0;
        let totalStampDuty = 0;
        let limitingFactor = { name: 'none', value: Infinity };

        // Initial limiting factors
        const initialMaxPriceFromCashCPF = totalLiquidity / (1 - this.MAX_LOAN_PERCENTAGE);
        const initialMaxPriceFromCashOnly = cash / this.MIN_CASH_PERCENTAGE;
        low = 0;
        high = Math.min(priceFromLoan, initialMaxPriceFromCashCPF, initialMaxPriceFromCashOnly, maxPriceByLiquidity * 2);
        let feasiblePrice = high;

        for (let iteration = 0; iteration < 20; iteration++) {
            const currentPrice = (low + high) / 2;
            if (currentPrice <= 0) break;

            // Calculate stamp duties
            bsd = this.calculateBSD(currentPrice);
            absd = this.calculateABSD(currentPrice, highestResidency);
            totalStampDuty = bsd + absd;

            // Adjust cash/CPF
            adjustedCash = cash;
            adjustedCPF = cpf;
            if (canUseCpfForStampDuty) {
                if (cpf >= totalStampDuty) {
                    adjustedCPF = cpf - totalStampDuty;
                } else {
                    adjustedCPF = 0;
                    adjustedCash = cash - (totalStampDuty - cpf);
                }
            } else {
                adjustedCash = cash - totalStampDuty;
            }
            adjustedCash = Math.max(adjustedCash, 0);
            adjustedCPF = Math.max(adjustedCPF, 0);
            const adjustedTotalLiquidity = adjustedCash + adjustedCPF;

            // Recalculate limiting factors
            const maxPriceFromCashCPF = adjustedTotalLiquidity / (1 - this.MAX_LOAN_PERCENTAGE);
            const maxPriceFromCashOnly = adjustedCash / this.MIN_CASH_PERCENTAGE;
            const limitingFactors = [
                { name: 'loan', value: priceFromLoan },
                { name: 'cashCPF', value: maxPriceFromCashCPF },
                { name: 'cashOnly', value: maxPriceFromCashOnly }
            ];
            limitingFactor = limitingFactors.reduce((lowest, current) => 
                current.value < lowest.value ? current : lowest
            );
            maxPropertyPrice = limitingFactor.value;

            // Check feasibility
            const requiredCash = currentPrice * this.MIN_CASH_PERCENTAGE;
            const requiredDownpayment = currentPrice * (1 - this.MAX_LOAN_PERCENTAGE);
            if (adjustedCash >= requiredCash && adjustedTotalLiquidity >= requiredDownpayment && maxPropertyPrice >= currentPrice) {
                feasiblePrice = currentPrice;
                low = currentPrice;
            } else {
                high = currentPrice;
            }
            if (high - low < 1) break;
        }

        maxPropertyPrice = Math.round(feasiblePrice);
        if (maxPropertyPrice <= 0) {
            maxPropertyPrice = 0;
            adjustedCash = cash;
            adjustedCPF = cpf;
            bsd = 0;
            absd = 0;
            totalStampDuty = 0;
        } else {
            // Final stamp duty calculation
            bsd = this.calculateBSD(maxPropertyPrice);
            absd = this.calculateABSD(maxPropertyPrice, highestResidency);
            totalStampDuty = bsd + absd;

            // Final adjustment of cash/CPF
            adjustedCash = cash;
            adjustedCPF = cpf;
            if (canUseCpfForStampDuty) {
                if (cpf >= totalStampDuty) {
                    adjustedCPF = cpf - totalStampDuty;
                } else {
                    adjustedCPF = 0;
                    adjustedCash = cash - (totalStampDuty - cpf);
                }
            } else {
                adjustedCash = cash - totalStampDuty;
            }
            adjustedCash = Math.max(adjustedCash, 0);
            adjustedCPF = Math.max(adjustedCPF, 0);
        }

        // Final limiting factors
        const adjustedTotalLiquidity = adjustedCash + adjustedCPF;
        const maxPriceFromCashCPF = adjustedTotalLiquidity / (1 - this.MAX_LOAN_PERCENTAGE);
        const maxPriceFromCashOnly = adjustedCash / this.MIN_CASH_PERCENTAGE;
        const limitingFactors = [
            { name: 'loan', value: priceFromLoan },
            { name: 'cashCPF', value: maxPriceFromCashCPF },
            { name: 'cashOnly', value: maxPriceFromCashOnly }
        ];
        limitingFactor = limitingFactors.reduce((lowest, current) => 
            current.value < lowest.value ? current : lowest
        );
        maxPropertyPrice = Math.min(maxPropertyPrice, limitingFactor.value);

        let finalCash = 0;
        let finalCPF = 0;
        let finalLoan = 0;
        let balanceLiquidity = 0;

        if (maxPropertyPrice === 0) {
            finalCash = 0;
            finalCPF = 0;
            finalLoan = 0;
            balanceLiquidity = adjustedTotalLiquidity;
            this.displayCashDownpayment = 0;
            this.displayCpfDownpayment = 0;
            limitingFactor = { name: 'none', value: 0 };
        } else if (limitingFactor.name === 'loan') {
            const minDownpayment = priceFromLoan * (1 - this.MAX_LOAN_PERCENTAGE);
            const minCashRequired = priceFromLoan * this.MIN_CASH_PERCENTAGE;
            const displayDownpayment = priceFromLoan * (this.MIN_CASH_PERCENTAGE + this.CPF_CASH_PERCENTAGE);
            const excessLiquidity = adjustedTotalLiquidity - displayDownpayment;
            balanceLiquidity = excessLiquidity > 0 ? excessLiquidity : 0;

            const potentialMaxPropertyPrice = excessLiquidity > 0 
                ? priceFromLoan + (adjustedTotalLiquidity - displayDownpayment) 
                : priceFromLoan;

            const cashPercentage = (adjustedCash / potentialMaxPropertyPrice) * 100;

            if (cashPercentage < this.MIN_CASH_PERCENTAGE * 100) {
                maxPropertyPrice = adjustedCash / this.MIN_CASH_PERCENTAGE;
                finalCash = adjustedCash;
                finalCPF = Math.min(adjustedCPF, maxPropertyPrice - finalCash - actualLoanEligibility);
                finalLoan = Math.min(maxPropertyPrice - finalCash - finalCPF, actualLoanEligibility);
                balanceLiquidity = adjustedCPF - finalCPF;
                this.displayCashDownpayment = finalCash;
                this.displayCpfDownpayment = finalCPF;
            } else {
                if (excessLiquidity > 0) {
                    maxPropertyPrice = priceFromLoan + (adjustedTotalLiquidity - displayDownpayment);
                    finalLoan = actualLoanEligibility;
                    const displayCashDownpayment = priceFromLoan * this.MIN_CASH_PERCENTAGE;
                    const displayCpfDownpayment = priceFromLoan * this.CPF_CASH_PERCENTAGE;

                    if (adjustedCash >= displayCashDownpayment) {
                        finalCash = displayCashDownpayment;
                        const remainingCash = adjustedCash - displayCashDownpayment;
                        const totalForRemaining = remainingCash + adjustedCPF;
                        const remainingNeeded = maxPropertyPrice - finalLoan - displayCashDownpayment;

                        if (totalForRemaining >= remainingNeeded) {
                            if (adjustedCPF >= remainingNeeded) {
                                finalCPF = remainingNeeded;
                            } else {
                                finalCPF = adjustedCPF;
                                finalCash += (remainingNeeded - adjustedCPF);
                            }
                        } else {
                            finalCPF = adjustedCPF;
                            finalCash += remainingCash;
                        }
                    } else {
                        finalCash = adjustedCash;
                        finalCPF = Math.min(adjustedCPF, maxPropertyPrice - finalLoan - finalCash);
                    }

                    this.displayCashDownpayment = displayCashDownpayment;
                    this.displayCpfDownpayment = displayCpfDownpayment;
                } else {
                    maxPropertyPrice = priceFromLoan;
                    this.displayCashDownpayment = priceFromLoan * this.MIN_CASH_PERCENTAGE;
                    this.displayCpfDownpayment = priceFromLoan * this.CPF_CASH_PERCENTAGE;

                    if (adjustedCash >= this.displayCashDownpayment) {
                        finalCash = this.displayCashDownpayment;
                        finalCPF = Math.min(adjustedCPF, maxPropertyPrice - finalLoan - finalCash);
                    } else {
                        finalCash = adjustedCash;
                        finalCPF = Math.min(adjustedCPF, maxPropertyPrice - finalLoan - finalCash);
                    }
                    finalLoan = maxPropertyPrice * this.MAX_LOAN_PERCENTAGE;
                }
            }
        } else if (limitingFactor.name === 'cashCPF') {
            maxPropertyPrice = maxPriceFromCashCPF;
            finalCash = adjustedCash;
            finalCPF = adjustedCPF;
            finalLoan = Math.min(maxPropertyPrice - finalCash - finalCPF, actualLoanEligibility);
            balanceLiquidity = 0;
            this.displayCashDownpayment = finalCash;
            this.displayCpfDownpayment = finalCPF;
        } else {
            maxPropertyPrice = maxPriceFromCashOnly;
            finalCash = adjustedCash;
            finalCPF = adjustedCPF;
            const totalMaximumPrice = finalCash + finalCPF + actualLoanEligibility;

            if (totalMaximumPrice < maxPropertyPrice) {
                maxPropertyPrice = totalMaximumPrice;
                finalLoan = actualLoanEligibility;
            } else {
                finalLoan = maxPropertyPrice - finalCash - finalCPF;
                if (finalLoan < 0) {
                    const regulatedMaxPrice = maxPriceFromCashOnly;
                    finalCash = regulatedMaxPrice * this.MIN_CASH_PERCENTAGE;
                    finalCPF = Math.min(adjustedCPF, regulatedMaxPrice * this.CPF_CASH_PERCENTAGE);
                    finalLoan = Math.min(regulatedMaxPrice * this.MAX_LOAN_PERCENTAGE, actualLoanEligibility);
                    maxPropertyPrice = finalCash + finalCPF + finalLoan;
                }
            }

            balanceLiquidity = 0;
            this.displayCashDownpayment = finalCash;
            this.displayCpfDownpayment = finalCPF;
        }

        // Ensure loan amount is non-negative
        finalLoan = Math.max(finalLoan, 0);

        // Calculate percentages of contribution
        const cashPercentage = maxPropertyPrice > 0 ? (finalCash / maxPropertyPrice) * 100 : 0;
        const cpfPercentage = maxPropertyPrice > 0 ? (finalCPF / maxPropertyPrice) * 100 : 0;
        const loanPercentage = maxPropertyPrice > 0 ? (finalLoan / maxPropertyPrice) * 100 : 0;

        // Prepare explanation text
        let limitingFactorText = "";
        if (maxPropertyPrice === 0) {
            limitingFactorText = "Insufficient Cash/CPF for Stamp Duty";
        } else if (limitingFactor.name === 'loan') {
            if (cashPercentage < this.MIN_CASH_PERCENTAGE * 100) {
                limitingFactorText = "Cash (5% minimum)";
            } else {
                limitingFactorText = "Loan Eligibility";
            }
        } else if (limitingFactor.name === 'cashCPF') {
            limitingFactorText = "Cash + CPF";
        } else {
            limitingFactorText = "Cash";
        }

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
        document.getElementById('cashDownpayment').textContent = formatCurrency(this.displayCashDownpayment);
        document.getElementById('cpfDownpayment').textContent = formatCurrency(this.displayCpfDownpayment);
        document.getElementById('balanceLiquidity').textContent = formatCurrency(balanceLiquidity);
        document.getElementById('balanceLiquidityLabel').textContent = 
            limitingFactor.name === 'loan' && balanceLiquidity > 0 
                ? "Balance Liquidity after 25% (5%+20%) downpayment and stamp duties:"
                : "Balance Liquidity after stamp duties:";
        document.getElementById('cashContribution').innerHTML = formatContribution(cashPercentage, finalCash);
        document.getElementById('cpfContribution').innerHTML = formatContribution(cpfPercentage, finalCPF);
        document.getElementById('loanContribution').innerHTML = formatContribution(loanPercentage, finalLoan);
        document.getElementById('actualLoanEligibility').textContent = formatCurrency(actualLoanEligibility);
        document.getElementById('limitingFactor').textContent = limitingFactorText;
        document.getElementById('bsdAmount').textContent = formatCurrency(bsd);
        document.getElementById('absdAmount').textContent = formatCurrency(absd);
        document.getElementById('totalStampDuty').textContent = formatCurrency(totalStampDuty);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MaxPriceCalculator();
});