# One Dice Six
Contributors: leonatkinson
Tags: random, rpg, role-playing-game, osr
Requires at least: 5.2.0
Tested up to: 6.8.0
Stable tag: trunk
License: MIT
License URI: https://opensource.org/licenses/MIT

Add block to display random generators defined by simple domain specific language.

## Description

One Dice Six adds a block to the gutenberg editor that represents a random
generator. The generator itself is defined in a text file inside the plugin's
`generators` folder. The plugin discovers new generators when they are placed
in this folder.

On the front end, JavaScript loads the generator and renders a form for running
it. Many generators are simple table lookups. A few have extra logic. The JavaScript
applies this based on the generator name.

All generators use the following format.

    name: Books
    description: Returns a list of books found in a library.
    recipe:
        This book's cover is {book_cover}. The condition is {book_condition}.
        The subject is {book_subject}, {book_volume}.
    repeat: 3d6-3

All generators have name, description, recipe and repeat. The name and description
are for your reference only. Some custom generators may ignore the recipe. Otherwise,
the generator will start with the recipe and begin replacing commands inside
curly braces with a table lookup or a random number. The recipe itself will be
re-run according to the value of the repeat property.

Note that long values, such as the recipe above, may be broken into multiple lines
for reability by adding indenting spaces.

To generate a dice roll in a recipe, you may use the following patterns.

* 1 (number only)
* 3d6 (3 six-sided dice added together to generate values from 3 to 18)
* 3d6-3 (Generates values from 0 to 15)

To make a lookup against a table, put the name of the table in curly braces and
define the table later in the file. You may also specify a repeating table
reference by putting a dice roll inside the curly braces.

* {table_name}
* {2 table_name} (roll on the table twice)
* {2d6+1 table_name} (roll on the table 3-13 times)

Tables are defined with a header row and a list of results. The header row must
start with `name: ` and set a unique name. Optionally, the header may set a dice
roll and a nice name. In the following example, the table would be referenced
with `{weapon}` and will roll two four-sided dice.

    name: weapon 2d4 Weapon Used
    2   Sword
    3   Dagger
    4   Spear
    5   Club
    6   {weapon} and {weapon}
    7-8 Flail

2d4 will generate values from 2 through 8. Each possible value has a row using
the format of value, space, result. Any number of spaces may be used to produce
the most readable format. Values may be single integers or a range as shown in
the last row. Results may be plain text or contain curly brace expressions as
decribed above for recipes.

After replacing curly brace expressions in the recipe, if the result contains
new expressions, the generator makes another pass. Processing continues until
no expressions remain. This allows for results from one table to refer to
another or even recursively as in the example above.

See [leonatkinson.com/one-dice-six](https://www.leonatkinson.com/one-dice-six/) for the original release.

## Installation

1. Copy the entire plugin folder into wp-content/plugins.
1. Activate the plugin
1. Place a One Dice Six block on a page.

## Screenshots

### Public View
![Public view of the Mage Spellbook generator](screenshots/rendered.png?raw=true "Public View")

### Editor View
![View from gutenberg editor](screenshots/block.png?raw=true "Editor View")

## Changelog

### 1.0.0
* Initial Release
### 1.1.0
* Added more generators
* Add special logic for underdark tunnels
* Add logic for multi-stage reaction rolls
* Revised Death generator rules
* Fixed number appearing in encounters generator
* Disable setting versions of css and js files
### 1.2.0
* Updated and added generators
### 1.3.0
* Added support for repeaters
* Added BFRPG treasure generator
### 1.4.0
* Fix cargo-food typo
* Fix label assignments
* Add Wight-Box Oracle
* Sort generator list by name
* Update text of death generator
* Reduce chance of Giant Roc
* Use repeaters for island settlements
### 1.4.1
Small adjustments to daily events on the southern seas.

* Villages on islands now have ships in harbor or nearby
* Spotted distances can be longer and now marked as "possibly" spotted.
### 1.4.2
* Add forms of government for villages.
### 1.5.0
* Make minor adjustments to monster generator
* Add poison generator
### 1.5.1
* Add time of day for southern sea events
* Add island size in miles or yards
### 1.5.2
* Add adventure locations to southern sea events
### 1.5.3
* Add fish meat yield and chance of disease
* Ships have notes about whether they have armored bows for ramming.
* Vary lengths of caravels and carracks
### 1.6.0
* Allow repeat commands to specify dice rolls, too
### 1.6.1
* Add weather to southern seas events
* Add monster notes to southern seas events
### 1.6.2
- Rename forts to frontier-forts.txt
- Add new forts.txt
### 1.6.3
- Add mine.txt
### 1.7.0
- Add optional separator param for repeaters. Default is still ", " but now you
  can use expressions like {1d6 tablename <br>} to separate with line breaks.
- Add named counters. The expression is like {#} or {# name}. Leaving the name
  out uses "default".
- Add mage-tower.txt
