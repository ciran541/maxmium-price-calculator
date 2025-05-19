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
        const totalLiquidity = cash + cpf;
    
        // Monthly Payment Capacity
        const tdsrAvailable = Math.max(totalIncome * this.TDSR_LIMIT - totalCommitments, 0);
        const msrAvailable = totalIncome * this.MSR_LIMIT;
        const monthlyPayment = (propertyType === 'hdb' || propertyType === 'ecNewLaunch') ? 
                              Math.min(tdsrAvailable, msrAvailable) : tdsrAvailable;
    
        // Loan Eligibility - this is the actual loan amount the borrower qualifies for
        const months = tenure * 12;
        const actualLoanEligibility = this.calculatePV(this.STRESS_TEST_RATE, months, monthlyPayment);
    
        // Calculate maximum price based on all three limiting factors
        
        // 1. Loan-based maximum price (75% loan-to-value)
        const priceFromLoan = actualLoanEligibility / this.MAX_LOAN_PERCENTAGE;
        
        // 2. Cash+CPF-based maximum price (25% downpayment requirement)
        const maxPriceFromCashCPF = totalLiquidity / (1 - this.MAX_LOAN_PERCENTAGE); // Total liquidity / 25%
        
        // 3. Cash-only based maximum price (5% minimum cash requirement)
        const maxPriceFromCashOnly = cash / this.MIN_CASH_PERCENTAGE; // Cash / 5%
        
        // Get the limiting factor and corresponding maximum price
        const limitingFactors = [
            { name: 'loan', value: priceFromLoan },
            { name: 'cashCPF', value: maxPriceFromCashCPF },
            { name: 'cashOnly', value: maxPriceFromCashOnly }
        ];
        
        // Find the lowest (limiting) value
        const limitingFactor = limitingFactors.reduce((lowest, current) => 
            current.value < lowest.value ? current : lowest
        );
        
        // Initialize variables for the calculation
        let maxPropertyPrice, finalCash, finalCPF, finalLoan, balanceLiquidity = 0;
        
        // UPDATED LOGIC: When loan is the limiting factor, add balance liquidity to max price
        if (limitingFactor.name === 'loan') {
            // Calculate how much downpayment is needed for the loan-limited price
            const minDownpayment = priceFromLoan * (1 - this.MAX_LOAN_PERCENTAGE);
            const minCashRequired = priceFromLoan * this.MIN_CASH_PERCENTAGE;
            
            // New rule: Calculate the total downpayment shown for display (5% + 20% of priceFromLoan)
            const displayDownpayment = priceFromLoan * (this.MIN_CASH_PERCENTAGE + this.CPF_CASH_PERCENTAGE);
            
            // Calculate excess liquidity based on the actual liquidity minus the display downpayment
            const excessLiquidity = totalLiquidity - displayDownpayment;
            
            // Store the excess liquidity value to display to the user 
            balanceLiquidity = excessLiquidity > 0 ? excessLiquidity : 0;
            
            // First check if cash percentage meets the 5% minimum requirement
            // Check the potential max property price with excess liquidity
            const potentialMaxPropertyPrice = excessLiquidity > 0 ? 
                priceFromLoan + (totalLiquidity - displayDownpayment) : 
                priceFromLoan;
                
            // Calculate the cash percentage of this potential max price
            const cashPercentage = (cash / potentialMaxPropertyPrice) * 100;
            
            // If cash is less than 5% of the potential max price, cash becomes the limiting factor
            if (cashPercentage < this.MIN_CASH_PERCENTAGE * 100) {
                // Cash is less than 5%, need to cap the max price
                maxPropertyPrice = cash / this.MIN_CASH_PERCENTAGE;
                finalCash = cash; // Use all available cash (exactly 5%)
                finalLoan = Math.min(maxPropertyPrice * this.MAX_LOAN_PERCENTAGE, actualLoanEligibility);
                finalCPF = maxPropertyPrice - finalCash - finalLoan;
                
                // There might be excess CPF that can't be used
                balanceLiquidity = cpf - finalCPF;
                
                // For display values
                this.displayCashDownpayment = finalCash;
                this.displayCpfDownpayment = finalCPF;
            } else {
                // Cash meets 5% requirement, proceed with original loan-limiting factor logic
                if (excessLiquidity > 0) {
                    // This is the maximum price including the excess liquidity
                    maxPropertyPrice = priceFromLoan + (totalLiquidity - displayDownpayment);
                    
                    // Calculate contributions based on this new price
                    finalLoan = actualLoanEligibility; // The loan amount doesn't change
                    
                    // New rule: For display purposes, calculate downpayments based on priceFromLoan (actual loan eligibility/75%)
                    const displayCashDownpayment = priceFromLoan * this.MIN_CASH_PERCENTAGE;
                    const displayCpfDownpayment = priceFromLoan * this.CPF_CASH_PERCENTAGE;
                    
                    // For actual contribution values, use the real values
                    // We'll distribute the excess liquidity between cash and CPF proportionally based on available amounts
                    if (cash >= displayCashDownpayment) {
                        finalCash = displayCashDownpayment;
                        // The rest goes to CPF or cash depending on availability
                        const remainingCash = cash - displayCashDownpayment;
                        const totalForRemaining = remainingCash + cpf;
                        const remainingNeeded = maxPropertyPrice - finalLoan - displayCashDownpayment;
                        
                        if (totalForRemaining >= remainingNeeded) {
                            // If we have enough to cover the rest
                            if (cpf >= remainingNeeded) {
                                finalCPF = remainingNeeded;
                            } else {
                                finalCPF = cpf;
                                finalCash += (remainingNeeded - cpf);
                            }
                        } else {
                            // Not enough to cover (this shouldn't happen with our calculations but just in case)
                            finalCPF = cpf;
                            finalCash += remainingCash;
                        }
                    } else {
                        // Not enough cash to cover the minimum
                        finalCash = cash;
                        finalCPF = Math.min(cpf, maxPropertyPrice - finalLoan - finalCash);
                    }
                    
                    // Store the display values for the downpayment sections
                    this.displayCashDownpayment = displayCashDownpayment;
                    this.displayCpfDownpayment = displayCpfDownpayment;
                } else {
                    // Original logic for loan limiting factor
                    maxPropertyPrice = priceFromLoan;
                    
                    // New rule: For display purposes, calculate downpayments based on priceFromLoan
                    this.displayCashDownpayment = priceFromLoan * this.MIN_CASH_PERCENTAGE;
                    this.displayCpfDownpayment = priceFromLoan * this.CPF_CASH_PERCENTAGE;
                    
                    // For actual values used in calculations
                    if (cash >= this.displayCashDownpayment) {
                        finalCash = this.displayCashDownpayment;
                        finalCPF = Math.min(cpf, maxPropertyPrice - finalLoan - finalCash);
                    } else {
                        finalCash = cash;
                        finalCPF = Math.min(cpf, maxPropertyPrice - finalLoan - finalCash);
                    }
                    finalLoan = maxPropertyPrice * this.MAX_LOAN_PERCENTAGE;
                }
            }
        } 
        else if (limitingFactor.name === 'cashCPF') {
            // Cash+CPF is limiting factor (25% of price)
            maxPropertyPrice = maxPriceFromCashCPF;
            // In this case, we don't enforce 5% minimum cash
            // Use available cash and CPF as they are
            finalCash = cash;
            finalCPF = cpf;
            // Loan would be the remainder up to the maximum price
            finalLoan = Math.min(maxPropertyPrice - finalCash - finalCPF, actualLoanEligibility);
            balanceLiquidity = 0; // All liquidity is used
            
            // For other limiting factors, display values are the same as calculated values
            this.displayCashDownpayment = finalCash;
            this.displayCpfDownpayment = finalCPF;
        } 
        else {
            // Cash is limiting factor (5% of price)
            maxPropertyPrice = maxPriceFromCashOnly;
            
            // Calculate what the property price would be with all available cash and CPF
            finalCash = cash;
            finalCPF = cpf;
            
            // Calculate the total property value if we used all cash and CPF plus maximum loan
            const totalMaximumPrice = finalCash + finalCPF + actualLoanEligibility;
            
            // Check if this total is less than the cash-limited maximum price
            if (totalMaximumPrice < maxPropertyPrice) {
                // Case where not enough total funding is available
                // We need to reduce property price to what's actually affordable
                maxPropertyPrice = totalMaximumPrice;
                finalLoan = actualLoanEligibility;
            } else {
                // Normal case - enough funding available
                // Loan is just what's needed after cash and CPF
                finalLoan = maxPropertyPrice - finalCash - finalCPF;
                
                // Check if the loan is negative, which means we have too much cash+CPF
                if (finalLoan < 0) {
                    // Apply the strict regulatory percentages
                    const regulatedMaxPrice = maxPriceFromCashOnly;
                    finalCash = regulatedMaxPrice * this.MIN_CASH_PERCENTAGE;
                    finalCPF = Math.min(cpf, regulatedMaxPrice * this.CPF_CASH_PERCENTAGE);
                    finalLoan = Math.min(regulatedMaxPrice * this.MAX_LOAN_PERCENTAGE, actualLoanEligibility);
                    maxPropertyPrice = finalCash + finalCPF + finalLoan;
                }
            }
            
            balanceLiquidity = 0; // All liquidity is used
            
            // For display values
            this.displayCashDownpayment = finalCash;
            this.displayCpfDownpayment = finalCPF;
        }
        
        // Ensure loan amount is never negative
        finalLoan = Math.max(finalLoan, 0);
        
        // Calculate percentages of contribution
        const cashPercentage = (finalCash / maxPropertyPrice) * 100;
        const cpfPercentage = (finalCPF / maxPropertyPrice) * 100;
        const loanPercentage = (finalLoan / maxPropertyPrice) * 100;
        
        // Prepare explanation text
        let limitingFactorText = "";
        if (limitingFactor.name === 'loan') {
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
        
        // Add label for balance liquidity to make it clear
        const balanceLiquidityLabel = document.getElementById('balanceLiquidityLabel');
        if (balanceLiquidityLabel) {
            if (limitingFactor.name === 'loan' && balanceLiquidity > 0) {
                balanceLiquidityLabel.textContent = "Balance Liquidity after 25% (5%+20%) downpayment:";
            } else {
                balanceLiquidityLabel.textContent = "Balance Liquidity:";
            }
        }
        document.getElementById('cashContribution').innerHTML = formatContribution(cashPercentage, finalCash);
        document.getElementById('cpfContribution').innerHTML = formatContribution(cpfPercentage, finalCPF);
        document.getElementById('loanContribution').innerHTML = formatContribution(loanPercentage, finalLoan);
        
        // Display actual loan eligibility for reference
        if (document.getElementById('actualLoanEligibility')) {
            document.getElementById('actualLoanEligibility').textContent = formatCurrency(actualLoanEligibility);
        }
        
        // Display the limiting factor explanation
        if (document.getElementById('limitingFactor')) {
            document.getElementById('limitingFactor').textContent = limitingFactorText;
        } else {
            console.log(limitingFactorText); // Log it if there's no UI element
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MaxPriceCalculator();
});