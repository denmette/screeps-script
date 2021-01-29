/*
 * This manager handles the links and to send resources.
 */

var constants = require('./main.constants');
var game = require('./main.game');
var info = require('./main.info');

var MemoryManager = require('./manager.memory');

const TYPE_TARGET = constants.LINK_TYPE_TARGET;
const TYPE_SOURCE = constants.LINK_TYPE_SOURCE;

class LinkManager {
	 
	/*
	 * Performs 'runLinks()' on an instance of LinkManager for each room. 
	 * 
	 * @param allRoles
	 */
	
	static runAll() {
	    game.findAllRooms().forEach(room => new LinkManager(room).runLinks());
	}
	
	/*
	 * Adds the type 'target' to the game object with the specified ID.
	 * 
	 * @param linkId
	 */

	static makeLinkTarget(linkId) {
		LinkManager._makeLinkType(linkId, TYPE_TARGET);
	}

	/*
	 * Adds the type 'source' to the game object with the specified ID.
	 * 
	 * @param linkId
	 */

	static makeLinkSource(linkId) {
		LinkManager._makeLinkType(linkId, TYPE_SOURCE);
	}

	/*
	 * Adds the specified type to the game object with the specified ID.
	 * 
	 * @param linkId
	 * @param type
	 */

	static _makeLinkType(linkId, type) {
		var object = Game.getObjectById(linkId);
		var memory = game.fetchMemoryOfStructure(object);
		memory.type = type; 
	}
	
	constructor(room) {
	    this._room = room;
	}
	
	/*
	 * Handles all links in this room.
	 */
	
	runLinks() { 
		// TODO: implement transferId 
		
		var allSourceLinks = this._findSourceLinks();
		allSourceLinks.forEach(sourceLink => this._runLink(sourceLink));
	}

	/*
	 * Finds all links that are sources for link-to-link communication.
	 */
	
	_findSourceLinks() {
		return this._room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => {
            	if (structure.structureType != STRUCTURE_LINK) {
            		return false;
            	}
        		var memory = game.fetchMemoryOfStructure(structure);
            	if (!memory.type) {
            		memory.type = TYPE_SOURCE;
            	}
                return memory.type == TYPE_SOURCE 
                	&& structure.store.getUsedCapacity(RESOURCE_ENERGY) >  0;
            }
		});
	}

	/*
	 * Handles the specific link in this room.
	 */
	
	_runLink(sourceLink) { 

		if (sourceLink.cooldown) {
			return;
		}
		
		// transfer my energy
		var targetLink = this._findTargetLink(sourceLink);
		if (targetLink) {
			sourceLink.transferEnergy(targetLink);  
			info.log('💫 transfering resources from ' + game.getDisplayName(sourceLink) + ' to ' + game.getDisplayName(targetLink));
		}
	}

	/*
	 * Finds a target for the specific source link.
	 */
	
	_findTargetLink(sourceLink) { 
		// TODO: sort by capacity?
		var targetLinks = this._room.find(FIND_MY_STRUCTURES, {
	        filter: (structure) => {
	        	if (structure.structureType != STRUCTURE_LINK) {
	        		return false;
	        	}
	            return game.fetchMemoryOfStructure(structure).type == TYPE_TARGET
	            	&& structure.store.getFreeCapacity(RESOURCE_ENERGY) >  0;
	        }
		});
		if (targetLinks.length == 0) {
			info.error('Did not find targets');
			return null;
		}
		return targetLinks[0];
	}
};

module.exports = LinkManager;