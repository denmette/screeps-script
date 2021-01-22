/*
 * This code is shared between the roles. It has standard behavior like:
 * - basic fields & methods
 * - moving to an appropriate source
 * - spawning new creeps
 * - commuting between an source and a target
 * 
 * You need to implement / set:
 * - roleName
 * - (color, symbol)
 * - _findTargets(room)
 * - work(creep)
 * 
 * You might need to override / set:
 * - priority
 * - useStorageAsSource, useSourceAsSource
 * - isNecessary(room) (on default it returns if a valid target is found)
 * - sortTargetForClosest(targets, creep) (on default it sorts for positions)
 */
 
var constants = require('./main.constants');
var game = require('./main.game');
var info = require('./main.info');

var MemoryManager = require('./manager.memory');

class RolePrototype {
    
	constructor(roleName = 'Prototype', color = '#ff0000', symbol = '❗') {
	    this.roleName = roleName;
	    this.color = color;
	    this.symbol = symbol;
	    this._priority = 0; // the higher the better
	}
	
	/*
	 * Creates a single creep for this role.
	 */
    
    spawnCreep(spawn) {
    	return this._spawnCreepWithParts(spawn, [WORK, CARRY, MOVE, MOVE]);
    }

    /*
	 * Return true if a creep with this role would have work to do, i.e. if the
	 * role is currently _really_ necessary.
	 * 
	 * @param {Room} room
	 */
    
    isNecessary(room) {
        var targets = this._findTargets(room);
        return targets && targets.length > 0;
    }
    
    /*
	 * Returns the primary target for the creep, e.g. energy stores for
	 * harvester and construction sites for builders.
	 * 
	 * @param {Room} room
	 */

    _findTargets(room) {
        return [];
    }

    /*
	 * Returns the closest primary target for the creep, e.g. energy stores for
	 * harvester and construction sites for builders.
	 * 
	 * @param {Creep} creep
	 */
    
    _findClosestTarget(creep) {
        var targets = this._findTargets(creep.room);
        if (targets) {
        	targets = this._sortTargetForClosest(targets, creep);
        	return targets.length > 0 ? targets[0] : null;
		}
        return null;
    }

    /*
	 * Sorts the targets so the closest is first. If there are other things to
	 * take into consideration, this function is overriden.
	 * 
	 * @param {Creep} creep
	 */
    
    _sortTargetForClosest(targets, creep) {
        return targets.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
    }

    /*
	 * Moves a creep to its closest primary target, e.g. energy stores for
	 * harvester and construction sites for builders.
	 * 
	 * @param {Creep} creep @param function the work that should be done there
	 */

    _moveToClosestTarget(creep, work) {
    	var target = this._findClosestTarget(creep);
    	
    	if (!target) return;
    	
    	var workResult = work(target);
        if (workResult == ERR_NOT_IN_RANGE) {
            if (creep.memory.debug) {      
                info.log(this.symbol + ' ' + game.getDisplayName(creep) + ' is moving to target ' + game.getDisplayName(target));  
            }
        	this._moveToLocation(creep, target);
        } else if (workResult == OK) {     
            if (creep.memory.debug) {
                info.log(this.symbol + ' ' + game.getDisplayName(creep) + ' is working on target ' + game.getDisplayName(target));  
            }
        } else {      
        	this._handleTargetWorkResult(creep, workResult);
        }
    }  

    /*
	 * Handles result of work on target.
	 * 
	 * @param {Creep} creep @param work result
	 */

    _handleTargetWorkResult(creep, workResult) {
    	info.warning(game.getDisplayName(creep) + ' cannot work: ' + workResult);  
    }
    
    /*
	 * Moves a creep to a location.
	 * 
	 * @param {Creep} creep @param location
	 */
    
    _moveToLocation(creep, location) {
    	creep.moveTo(location, {visualizePathStyle: {stroke: this.color}});
    	creep.memory.moving = true;
    }

    /*
	 * Moves a creep to a source.
	 * 
	 * @param {Creep} creep
	 */

    _moveToClosestSource(creep) {
    	// TODO: if source is empty, just go back to working
        var source = this._findClosestSource(creep);
        
    	if (!source) return;
    	
    	var harvestResult = source.structureType ? creep.withdraw(source, RESOURCE_ENERGY) : creep.harvest(source);
        if (harvestResult == ERR_NOT_IN_RANGE) {
            if (creep.memory.debug) {      
                info.log(this.symbol + ' ' + game.getDisplayName(creep) + ' is moving to source ' + game.getDisplayName(source));  
            }
            this._moveToLocation(creep, source);
        } else if (harvestResult == OK) {     
            if (creep.memory.debug) {
                info.log(this.symbol + ' ' + game.getDisplayName(creep) + ' is harvesting from source ' + game.getDisplayName(source));  
            }
        } else {      
            this._handleSourceWorkResult(creep, harvestResult);
        }
        return harvestResult;
    }

    /*
	 * Returns the closest source for the creep, e.g. sources or storages.
	 * 
	 * @param {Creep} creep
	 */
    
    _findClosestSource(creep) {
        var sources = this._findSources(creep.room);
        if (sources) {
            sources = this._sortSourceForClosest(sources, creep);
            return sources.length > 0 ? sources[0] : null;
        }
        return null;
    }

    /*
	 * Sorts the sources so the closest is first. If there are other things to
	 * take into consideration, this function is overriden.
	 * 
	 * @param {Creep} creep
	 */
    
    _sortSourceForClosest(sources, creep) {
        return sources.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
    }

    /*
	 * Returns the primary target for the creep, e.g. energy stores for
	 * harvester and construction sites for builders.
	 * 
	 * @param {Room} room
	 */

    _findSources(room) {
        var storages = this._useStorageAsSource ? room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_STORAGE ||
                        structure.structureType == STRUCTURE_CONTAINER ||
                        (structure.structureType == STRUCTURE_LINK && structure.memory && structure.memory.type == constants.LINK_TYPE_TARGET)) && 
                        structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
            }}) : [];
            
        var sources = this._useSourceAsSource ? room.find(FIND_SOURCES_ACTIVE, {
                filter: (source) => {
                    if (game.findAllCreeps().filter(creep => creep.memory.homeSource == source.id).length) {
                        // source was claimed by a miner
                        return false;
                    }
                    return source.energy > 0;
                }}) : [];
        
        return storages.concat(sources);
    }

    /*
	 * Handles result of harvest on source.
	 * 
	 * @param {Creep} creep @param harvest result
	 */

    _handleSourceWorkResult(creep, harvestResult) {
        info.warning(game.getDisplayName(creep) + ' cannot harvest: ' + harvestResult); 
    }
    
    /*
	 * Creep AI gets run. Creep might decide working is not in its best
	 * interest.
	 * 
	 * @param {Creep} creep
	 */
    
    run(creep) {
    	// we want to keep track when a creep is actually moving
    	creep.memory.moving = false;
    	
    	// init values from room memory
    	var memoryRoleConfig = MemoryManager.fetchRoomRoleConfigForBase(creep.memory.home, [ this ]);
	    this._useStorageAsSource = !memoryRoleConfig || memoryRoleConfig.useStorageAsSource;
	    this._useSourceAsSource = !memoryRoleConfig || memoryRoleConfig.useSourceAsSource;
    	
        
        // self-destructing is more important than working
        
        if (creep.memory.selfdestruct) {
            this._selfdestruct(creep);
            return;
        }
        
        // picking up energy is more important than working
        
        // TODO: make sure this is a resource creep can use
        var dropenergy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 3);
    	if (dropenergy.length > 0 && creep.store.getFreeCapacity() > 0) {
            if (creep.memory.debug) {
            	info.log('🟡 ' + game.getDisplayName(creep) + ' is picking up resource ' + game.getDisplayName(dropenergy[0]));
            }
        	if (creep.pickup(dropenergy[0]) == ERR_NOT_IN_RANGE) {
        		this._moveToLocation(creep, dropenergy[0]);
        		return;
        	}
        	// here is no return because creeps can pickup energy an work afterwards
    	} 

        // looting a tombstone is more important than working
    	
        var tombstones = creep.pos.findInRange(FIND_TOMBSTONES, 3).filter(t => t.store.getUsedCapacity() > 0);
		if (tombstones.length > 0 && creep.store.getFreeCapacity() > 0) {
        	this._lootTombstone(creep, tombstones[0]);
        	return;
    	}
    		
    		// TOOD: looting ruins and graves (if they have the resource) might be a good idea, too
//	        var ruin = creep.pos.findInRange(FIND_RUINS, 3);
//	    	if (ruin.length > 0 && creep.store.getFreeCapacity() > 0) {
//	            if (creep.memory.debug) {
//	            	info.log('⚰ ' + game.getDisplayName(creep) + ' is looting ruin ' + game.getDisplayName(dropenergy[0]));
//	            }
//	            var withdrawAnswer = creep.withdraw(ruin[0], RESOURCE_ENERGY);
//	        	if (withdrawAnswer == ERR_NOT_IN_RANGE) {
//	        		creep.moveTo(ruin[0])
//	        		return;
//	        	} 
//	        	console.log(withdrawAnswer);
//        		return;
//	    	}
        
        this._work(creep);
    }

    /*
	 * Creep self-destructs or tries to anyway.
	 * 
	 * @param {Creep} creep
	 */
    
    _selfdestruct(creep) {
        var spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
        if (spawn) {
            var recycleAnswer = spawn.recycleCreep(creep);
            if (recycleAnswer == ERR_NOT_IN_RANGE) {
                if (creep.memory.debug) {      
                    info.log('🔙 ' + game.getDisplayName(creep) + ' is moving to spawn ' + spawn.id);  
                }
                this._moveToLocation(creep, spawn);
            } else if (recycleAnswer == OK) {  
                if (creep.memory.debug) {
                    info.log('🗑 ' + game.getDisplayName(creep) + ' was recycled.');  
                }
            }
        } else {
            info.error(game.getDisplayName(creep) + ' could not find a spawn.');  
        }
    }

    /*
	 * Creep loots the tombstone.
	 * 
	 * @param {Creep} creep
	 */
    
    _lootTombstone(creep, tombstone) {
	    var withdrawResult = creep.withdraw(tombstone, RESOURCE_ENERGY);
		if (withdrawResult == ERR_NOT_IN_RANGE) {
            if (creep.memory.debug) {      
    	    	info.log('⚰ ' + game.getDisplayName(creep) + ' is moving to tombstone ' + game.getDisplayName(tombstone));
            }
    		this._moveToLocation(creep, tombstone);
		} else if (withdrawResult == OK) {
            if (creep.memory.debug) {      
    	    	info.log('⚰ ' + game.getDisplayName(creep) + ' is looting the tombstone ' + game.getDisplayName(tombstone));
            }
		} else {
	    	info.log('⚰ ' + game.getDisplayName(creep) + ' cannot loot the tombstone: ' + withdrawResult);
		}
	}

    /*
	 * Creep works.
	 * 
	 * @param {Creep} creep
	 */
    
    _work(creep) {
        // do nothing on default
        creep.say('🛑 unimplemented 🛑');
    }
    
    /*
	 * Creep goes to source until full, then works till it's empty and starts
	 * over.
	 * 
	 * @param {Creep} creep @param function the work that should be done there
	 */
    
    _commuteBetweenSourceAndTarget(creep, work) {
        if (creep.memory.working && creep.store.getUsedCapacity() == 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
        }
    
        if (creep.memory.working) {
            this._moveToClosestTarget(creep, work);
        } else {
            this._moveToClosestSource(creep);
        }
    }

    /*
	 * Spawns a creep that has the needed parts (or many of them) and a single
	 * part of some other type.
	 * 
	 * @param {Spawn} spawn @param parts to duplicate @param singleParts that
	 * are added as is
	 */
    
    _spawnCreepWithParts(spawn, parts, singleParts = []) {
        var parts = this._calculateMaxParts(spawn, parts, singleParts);
        if (parts) {
            var newName = this.roleName + ' ' + Game.time;
            var spawnResult = spawn.spawnCreep(parts, newName, { memory: {
                role: this.roleName,
                home: spawn.memory.home,
            }});
            if (spawnResult == OK) {
                return Game.creeps[newName];
            }
        }
        return false;
    }
    
    // after this point, the rest are only helper methods

    /*
	 * Calculate the max parts we can afford.
	 * 
	 * @param {Spawn} spawn @param parts to duplicate @param singleParts that
	 * are added as is
	 */
    
    _calculateMaxParts(spawn, parts = [], singleParts = []) {
        var costs = this._calculateCostsForParts(parts);
        
        var singleCosts = singleParts ? this._calculateCostsForParts(singleParts) : 0;

        if (!costs && !singleCosts) return null; // we can't spawn empty
													// parts
        
        var multiplier = this._getPartsMinMultiplier(spawn);
        var partsMaxMultiplier = this._getPartsMaxMultiplier(spawn);
      
        while ((multiplier + 1) * costs + singleCosts <= spawn.room.energyAvailable && multiplier < partsMaxMultiplier) {
            multiplier++;
        }
        
        if (multiplier === 0) {
            // we can't spawn anything right now
            return null;
        }
        
        return singleParts ? singleParts.concat(this._replicateParts(parts, multiplier)) : this._replicateParts(parts, multiplier);
    }

    /*
	 * Returns the minimum multiplier for the parts for this role.
	 * 
	 * @param {Spawn} spawn
	 */
    
    _getPartsMinMultiplier(spawn) {
        return (spawn.room.memory.base && spawn.room.memory.base.roleConfig && spawn.room.memory.base.roleConfig.partsMinMultiplier) || 0;
    }

    /*
	 * Returns the maximum multiplier for the parts for this role.
	 * 
	 * @param {Spawn} spawn
	 */
    
    _getPartsMaxMultiplier(spawn) {
        return (spawn.room.memory.base && spawn.room.memory.base.roleConfig && spawn.room.memory.base.roleConfig.partsMaxMultiplier) || 20;
    }

    /*
	 * Calculates the costs for the parts in the array.
	 * 
	 * @param parts array
	 */
    
    _calculateCostsForParts(parts) {
        var result = 0;
        parts.forEach(part => result += this._calculateCostsForSinglePart(part));
        return result;
    }

    /*
	 * Calculates the costs for a single part.
	 * 
	 * @param part
	 */
        
    _calculateCostsForSinglePart(part) {
        return BODYPART_COST[part];
    }

    /*
	 * Creates a new array and puts the parts array in there a specific amount
	 * of times.
	 * 
	 * @param part array @param multiplier how often to replicate the array
	 */
    
    _replicateParts(parts, multiplier) {
        var result = [];
        for (var i = 0; i < multiplier; i++) {
            result = result.concat(parts);
        }
        return result;
    }
    
};

module.exports = RolePrototype;