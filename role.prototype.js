/**
 * This code is shared between the roles. It has standard behavior like:
 * - basic fields & methods
 * - moving to an appropriate source
 * - spawning new creeps
 * - commuting between an source and a target
 * 
 * You need to implement / set
 * - roleName, requiredNumber
 * - (color, symbol)
 * - findTargets()
 * - work()
 */
var info = require('main.info');

const result = {
    
    roleName: 'XXX',
    requiredNumber: 0,
    color: '#ff0000',
    symbol: '❗',
    
    spawnCreep: function(spawn) {
    	return this.spawnCreepWithParts(spawn, [WORK, CARRY, MOVE, MOVE]);
    },

    /** 
     * Return true if a creep with this role would have work to do, 
     * i.e. if the role is currently _really_ necessary.
     * 
     * @param {Room} room 
     **/
    
    isNecessary: function(room) {
        var targets = this.findTargets(room);
        return targets && targets.length > 0;
    },
    
    /** 
     * Returns the primary target for the creep, e.g. energy stores for harvester and 
     * construction sites for builders. 
     * 
     * @param {Room} room 
     */

    findTargets: function(room) {
        return [];
    },

    /** 
     * Returns the closest primary target for the creep, e.g. energy stores for harvester and 
     * construction sites for builders. 
     * 
     * @param {Creep} creep 
     */
    
    findClosestTarget: function(creep) {
        var targets = this.findTargets(creep.room);
        if (targets) {
        	targets = this.sortTargetForClosest(targets, creep);
        	return targets.length > 0 ? targets[0] : null;
		}
        return null;
    },
    
    sortTargetForClosest: function(targets, creep) {
        return _.sortBy(targets, t => creep.pos.getRangeTo(t));
    },

    /** 
     * Moves a creep to its closest primary target, e.g. energy stores for harvester and 
     * construction sites for builders. 
     * 
     * @param {Creep} creep 
     * @param function the work that should be done there
     */

    moveToClosestTarget: function(creep, work) {
    	var target = this.findClosestTarget(creep);
    	
    	if (!target) return;
    	
    	var workResult = work(target);
        if (workResult == ERR_NOT_IN_RANGE) {
            if (creep.memory.debug) {      
                info.log(creep.memory.role + " is moving to target " + target.id);  
            }
        	this.moveToLocation(creep, target);
        } else if (workResult == OK) {     
            if (creep.memory.debug) {
                info.log(creep.memory.role + " is working on target " + target.id);  
            }
        } else {      
            info.log(creep.memory.role + " cannot work: " + workResult);  
        }
    },  

    /** 
     * Moves a creep to a location. 
     * 
     * @param {Creep} creep 
     * @param location
     */
    
    moveToLocation: function(creep, location) {
    	creep.moveTo(location, {visualizePathStyle: {stroke: this.color}});
    },

    /** 
     * Moves a creep to a source. 
     * 
     * @param {Creep} creep 
     */

    moveToSource: function(creep) {
        var source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        
    	if (!source) return;
    	
    	var harvestResult = creep.harvest(source);
        if (harvestResult == ERR_NOT_IN_RANGE) {
            if (creep.memory.debug) {      
                info.log(creep.memory.role + " is moving to source " + source.id);  
            }
            this.moveToLocation(creep, source);
        } else if (harvestResult == OK) {     
            if (creep.memory.debug) {
                info.log(creep.memory.role + " is harvesting from source " + source.id);  
            }
        } else {      
            info.log(creep.memory.role + " cannot harvest: " + harvestResult);  
        }
    },

    
    /** 
     * Creep AI gets run. Creep might decide working is not in its best interest. 
     * 
     * @param {Creep} creep 
     **/
    
    run: function(creep) {
        this.work(creep);
    },

    /** 
     * Creep works. 
     * 
     * @param {Creep} creep 
     **/
    
    work: function(creep) {
        // do nothing on default   
        creep.say('🔔 unimplemented');
    },
    
    
    /** 
     * Creep goes to source until full, then works till it's empty and starts over. 
     * 
     * @param {Creep} creep 
     * @param function the work that should be done there
     **/
    
    commuteBetweenSourceAndTarget: function(creep, work) {
        
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
        }
    
        if (creep.memory.working) {
            this.moveToClosestTarget(creep, work);
        } else {
            this.moveToSource(creep);
        }
    },
    
    /** 
     * Spawns a creep that has the needed parts (or many of them).
     * 
     * @param {Spawn} spawn 
     **/
    
    spawnCreepWithParts: function(spawn, parts) {
        var newName = this.roleName + ' ' + Game.time;
        var parts = this.calculateMaxParts(spawn, parts);
        if (parts) {
            var spawnResult = spawn.spawnCreep(parts, newName, {memory: {
                role: this.roleName,
                home: spawn.memory.home,
            }});
            if (spawnResult == OK) {
                return Game.creeps[newName];
            }
        }
        return false;
    },
    
    // after this point, the rest are only helper methods
    
    calculateMaxParts: function(spawn, parts) {
        var costs = this.calculateCostsForParts(parts);
        var multiplier = spawn.room.memory.base.partsMinMultiplier || 0;
        var partsMaxMultiplier = spawn.room.memory.base.partsMaxMultiplier || 20;
      
        while ((multiplier + 1) * costs <= spawn.room.energyAvailable && multiplier < partsMaxMultiplier) {
            multiplier++;
        }
        
        if (multiplier === 0) {
            // we can't spawn anything right now
            return null;
        }
        
        return this.replicateParts(parts, multiplier);
    },
    
    calculateCostsForParts: function(parts) {
        var result = 0;
        parts.forEach(part => result += this.calculateCostsForSinglePart(part));
        return result;
    },
        
    calculateCostsForSinglePart: function(part) {
        if (part == WORK) {
            return 100;
        }
        return 50; // MOVE & CARRY
    },
    
    replicateParts: function(parts, multiplier) {
        var result = [];
        for (var i = 0; i < multiplier; i++) {
            result = result.concat(parts);
        }
        return result;
    },
    
};

module.exports = result;