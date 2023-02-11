# One Dice Six
Contributors: leonatkinson
Tags: random, rpg, role-playing-game, osr
Requires at least: 5.2.0
Tested up to: 5.3.2
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
define the table later in the file. Tables are defined with a header row and a
list of results. The header row must start with `name: ` and set a unique name.
Optionally, the header may set a dice roll and a nice name. In the following
example, the table would be referenced with `{weapon}` and will roll two
four-sided dice.

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

## Installation

1. Copy the entire plugin folder into wp-content/plugins.
1. Activate the plugin
1. Place a One Dice Six block on a page.

## Screenshots

1. ![Public view of the Mage Spellbook generator](screenshots/rendered.png?raw=true "Public View")
2. ![View from gutenberg editor](screenshots/block.png?raw=true "Editor View")

## Changelog

### 1.0.0
* Initial Release
