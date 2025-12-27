/**
 * Vehicle which will move on screen.
 *
 * Financial Position affects physics:
 * - Leverage → Torque multiplier (more leverage = faster but less stable)
 * - Cash Buffer → Brake power (more cash = better stopping power)
 * - Volatility → Road roughness (high volatility = camera shake + reduced traction)
 */

class Vehicle
{
    constructor(scene, key='car1')
    {
        this.car_data; //JSON data
        this.car_parts;// actual objects
        this.mainBody;

        this.spawnPosX = 600;
        this.spawnPosY = 1200;

        // === FINANCIAL PHYSICS MODIFIERS ===
        // These affect how the car responds to input
        this.torqueMultiplier = 1.0;    // Modified by leverage
        this.brakeMultiplier = 1.0;     // Modified by cash buffer
        this.tractionMultiplier = 1.0;  // Modified by volatility

        // Base torque values from car config (stored for modification)
        this.baseTorque = 0.035;

        let posX = this.spawnPosX, posY = this.spawnPosY;

        this.car_data = scene.cache.json.get(key);

        this.car_data['image'].forEach(obj => {
            this[obj] = scene.matter.add.image(
                posX + this.car_data[obj].x, 
                posY + this.car_data[obj].y, 
                vehiclePartsKey,
                this.car_data[obj].image,
                {shape: this.car_data[obj]}
            );
            //z-index
            this[obj]['depth'] = this.car_data[obj]['depth'] ?? 0;
        });

        this.car_data['joint'].forEach(obj => {
            this[obj] = scene.matter.add.joint(
                this[this.car_data[obj].bodyA],
                this[this.car_data[obj].bodyB],
                this.car_data[obj].length,
                this.car_data[obj].stiffness,
                this.car_data[obj]                
            );
        });

        this.mainBody = this[this.car_data['mainBody']];
    }

    /**
     * Update physics modifiers based on financial position
     * Called each frame to sync car physics with financial state
     *
     * @param {number} leverage - Current leverage (1.0 = normal, 2.0 = 2x, etc.)
     * @param {number} cashBuffer - Cash buffer percentage (0-1, higher = more brake power)
     * @param {number} volatility - Market volatility (0-1, higher = worse traction)
     * @param {number} recoveryDrag - Drag from being in drawdown (1.0 = normal, >1 = harder)
     */
    updateFinancialPhysics(leverage, cashBuffer, volatility, recoveryDrag = 1.0) {
        // === LEVERAGE → TORQUE ===
        // Higher leverage = more power, but with diminishing returns above 2x
        // Formula: 0.8 + (leverage * 0.4) gives range 1.0 to 2.0 for 0.5x to 3x leverage
        this.torqueMultiplier = 0.8 + (leverage * 0.4);
        // Cap at 2.0x to prevent insane acceleration
        this.torqueMultiplier = Math.min(2.0, this.torqueMultiplier);

        // === RECOVERY DRAG → REDUCED TORQUE ===
        // When in drawdown, climbing back is HARDER (mathematical asymmetry)
        // This simulates the L/(1-L) recovery formula physically:
        // - 50% drawdown needs 100% recovery = 1.25x harder to accelerate
        // - 90% drawdown needs 900% recovery = 2.0x harder (capped)
        if (recoveryDrag > 1.0) {
            this.torqueMultiplier /= recoveryDrag;
        }

        // === CASH BUFFER → BRAKES ===
        // More cash = better braking (representing ability to stop/exit positions)
        // 0% cash = 0.5x brake power, 50% cash = 1.5x brake power
        this.brakeMultiplier = 0.5 + (cashBuffer * 2.0);

        // === VOLATILITY → TRACTION ===
        // High volatility = reduced traction (slippery roads)
        // 0 volatility = 1.0 traction, max volatility = 0.5 traction
        this.tractionMultiplier = 1.0 - (volatility * 0.5);
        this.tractionMultiplier = Math.max(0.5, this.tractionMultiplier);

        // Store recovery drag for HUD display
        this.recoveryDrag = recoveryDrag;
    }

    /**
     * Get current physics modifiers for HUD display
     */
    getPhysicsModifiers() {
        return {
            torque: this.torqueMultiplier,
            brake: this.brakeMultiplier,
            traction: this.tractionMultiplier,
            recoveryDrag: this.recoveryDrag || 1.0
        };
    }

    processKey(kbd)
    {
        let ip = this.car_data['processKey'];
        for(let key in ip) //keys = ["left", "right"][i]
        {
            for(let state in ip[key]) //state = ["isDown", "isUp"][i]
            {
                if(kbd[key][state]) //if key is in the state
                {
                    for(let part in ip[key][state]) //part = ["wheel1", "wheel2", "carbody"][i]
                    {
                        //TODO: use object.entries
                        for(let prop in ip[key][state][part]) //prop = ["torque", "force"][i]
                        {
                            let value = ip[key][state][part][prop];

                            // Apply financial physics modifiers
                            if (prop === 'torque') {
                                // Forward/acceleration torque
                                if ((key === 'right' && value > 0) || (key === 'left' && value < 0)) {
                                    // This is acceleration - apply leverage multiplier
                                    value *= this.torqueMultiplier;
                                }
                                // Braking/reverse torque
                                else if ((key === 'left' && value > 0) || (key === 'right' && value < 0)) {
                                    // This is braking - apply cash buffer multiplier
                                    // Note: "left" on wheels is braking when going right
                                    value *= this.brakeMultiplier;
                                }

                                // Apply traction modifier to all wheel torque
                                if (part.startsWith('wheel')) {
                                    value *= this.tractionMultiplier;
                                }
                            }

                            this[part]['body'][prop] = value;
                        }
                    }
                }

            }
        }
    }

    /**
     * Apply a random force to simulate rough road from volatility
     * Called each frame based on current volatility
     *
     * @param {number} volatility - Market volatility (0-1)
     */
    applyVolatilityShake(volatility) {
        if (!this.mainBody || !this.mainBody.body || volatility < 0.2) return;

        // Only apply shake when volatility is notable
        const shakeIntensity = (volatility - 0.2) * 0.0015; // Scale shake force

        // Random small forces to simulate bumpy road
        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity * 0.5; // Less vertical shake

        // Apply force to car body
        this.mainBody.body.force.x += shakeX;
        this.mainBody.body.force.y += shakeY;
    }

}