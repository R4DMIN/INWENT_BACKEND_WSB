const logger = require('./logger')

/**
 * Zwraca konfigurację zapytania `find` oraz `populate` moongose na podstawie listy kolumn i schematów populacji,
 * które umożliwiają załadowanie danych z powiązanych dokumentów.
 *
 * @param {Array<string>} columnsQueryArray - Tablica kluczy kolumn, np. `['column1', 'column2', 'column3']`.
 *   Jest to lista kolumn, które mają być uwzględnione w zapytaniu.
 *
 * @param {Array<Object>} populateSchemaList - Tablica obiektów określających konfigurację ścieżek i kluczy do operacji `populate`.
 *   Każdy obiekt zawiera właściwości:
 *   - `path`: {string} - Ścieżka do powiązanego dokumentu w schemacie Mongoose.
 *   - `keys`: {Array<string>} - Lista kluczy, które mają zostać załadowane z tego powiązanego dokumentu.
 *   - `as` (opcjonalne): {Object} - Opcjonalny obiekt, który pozwala na nadanie aliasów kluczom w ramach `populate`.
 *   - `virtual` (opcjonalne): {Object} - Opcjonalny obiekt, który wskazuje konieczne klucze dla wirtualnych pól skonfigurowanych w moongose
 *
 *   Przykładowy format:
 *   ```javascript
 *   [
 *      {
 *         path: 'nazwa_ścieżki_mongoose',
 *         keys: ['klucz1', 'klucz2', 'klucz3'],
 *         as: { 'klucz1': 'alias1' },
 *         virtual: { 'wirtualne_pole': 'klucz2 klucz3' }
 *       },
 *      {
 *         path: 'nazwa_ścieżki_mongoose2',
 *         keys: ['klucz4', 'klucz5'],
 *       },
 *      // więcej obiektów
 *   ]
 *   ```
 *
 * @returns {[query: Object, populateQueryObjects: Object]} - Tablica dwóch obiektów:
 *   - `query`: Obiekt z konfiguracją zapytania `find`, zawierający filtry na podstawie podanych kolumn.
 *   - `populateQueryObjects`: Obiekt z konfiguracją operacji `populate`, który zawiera ścieżki i klucze do załadowania z powiązanych dokumentów.
 */

const getQueryFromColumnsList = (columnsQueryArray, populateSchemaList) => {
    let query = {}
    let populateQueryObjects = {}

    // wszystkie przekazane klucze sprawdź 
    columnsQueryArray.forEach(key => {
        let addToQuery = true
        //przez wszystkie możliwe ścieżki do populacji
        populateSchemaList.forEach(populateSchema => {
            // jeżeli sprawdzany klucz znaduje się w licie sprawdzanej populacji
            if (populateSchema.keys.includes(key)) {
                addToQuery = false //jeżeli klucz będzie znaleziony w populateSchemaList to nie dodawaj go do query
                const keyToPopulate = (populateSchema.as && populateSchema.as[key])
                    ? populateSchema.as[key]
                    : (populateSchema.virtual && populateSchema.virtual[key])
                        ? populateSchema.virtual[key]
                        : key
                //jeżeli to pierwszy klucz to dodaj ścieżkę i klucz
                if (!populateQueryObjects[populateSchema.path]) {
                    populateQueryObjects[populateSchema.path] = { path: populateSchema.path, select: keyToPopulate }
                    return
                }
                // jeżeli ścieżka już istnieje to dodaj tylko kolejny klucz
                else {
                    populateQueryObjects[populateSchema.path].select = populateQueryObjects[populateSchema.path].select + ' ' + keyToPopulate
                    return
                }
            }
        })
        // jeżeli klucza nie ma w liśćie populacji to dodaj do query 
        if (addToQuery)
            query[key] = 1
    })

    //konwersja populateQuery z objetków na array 
    let populateQueryArray = []
    Object.keys(populateQueryObjects).forEach((key) => {
        populateQueryArray.push(populateQueryObjects[key])
    })

    return [query, populateQueryArray]
}

/**
 * Zwraca płaski obiekt na podstawie kluczy przekazanych w argumencie `columnsQueryArray` oraz na podstawie `populateSchemaList`,
 * która określa ścieżki populacji. Dzięki temu można określić, które klucze są zagnieżdżone pod innymi kluczami.
 *
 * Funkcja spłaszcza obiekt, mapując zagnieżdżone klucze na poziom główny obiektu zgodnie z podanymi ścieżkami i aliasami
 * uwzględniając klucze zdefiniowane w `columnsQueryArray` i `populateSchemaList`.
 * 
 * @param {Object} object - Obiekt do spłaszczenia, zawierający dane, które będą mapowane na podstawie podanych parametrów.
 * 
 * @param {Array<string>} columnsQueryArray - Tablica kluczy kolumn, np. `['column1', 'column2', 'column3']`.
 *   Jest to lista kluczy, które mają zostać uwzględnione w wyniku spłaszczonego obiektu.
 *
 * @param {Array<Object>} populateSchemaList - Tablica obiektów określających konfigurację ścieżek i kluczy do operacji `populate`.
 *   Każdy obiekt zawiera właściwości:
 *   - `path`: {string} - Ścieżka w schemacie Mongoose do powiązanego dokumentu.
 *   - `keys`: {Array<string>} - Lista kluczy, które mają zostać załadowane z powiązanego dokumentu.
 *   - `as` (opcjonalne): {Object} - Opcjonalny obiekt, który pozwala na nadanie aliasów kluczom w ramach `populate`.
 *     Jeśli `as` jest zdefiniowane, to klucze wskazane w `keys` będą zamapowane na aliasy określone w `as`.
 *
 *   Przykładowy format:
 *   ```javascript
 *   [
 *      {
 *         path: 'nazwa_ścieżki_mongoose',
 *         keys: ['klucz1', 'klucz2', 'klucz3'],
 *         as: { 'klucz1': 'customKeyName' }
 *       },
 *      {
 *         path: 'nazwa_ścieżki_mongoose2',
 *         keys: ['klucz4', 'klucz5']
 *       },
 *      // więcej obiektów
 *   ]
 *   ```
 * 
 * @returns {{ newObject: Object }} - Obiekt po spłaszczeniu, w którym zagnieżdżone dane zostały przeniesione na poziom główny,
 *   a klucze zostały odpowiednio przekształcone lub załadowane z powiązanych dokumentów.
 */
const makeObjectFlat = (object, columnsQueryArray, populateSchemaList) => {
    let newObject = {}

    columnsQueryArray.forEach(key => {
        let keyNotFound = true
        populateSchemaList.forEach(populateSchema => {
            if (key === populateSchema.path) {
                keyNotFound = false
                if (object[populateSchema.path]) newObject[key] = object[populateSchema.path].id
                newObject[key] = object[populateSchema.path] !== undefined
                    ? object[populateSchema.path].id
                    : undefined
            }
            else if (populateSchema.as && populateSchema.as[key]) {
                keyNotFound = false
                newObject[key] = object[populateSchema.path] !== undefined
                    ? object[populateSchema.path][populateSchema.as[key]]
                    : undefined
            }
            else if (populateSchema.keys.includes(key)) {
                keyNotFound = false
                newObject[key] = object[populateSchema.path] !== undefined
                    ? object[populateSchema.path][key]
                    : undefined
            }
        })
        if (keyNotFound) newObject[key] = object[key] !== undefined ? object[key] : undefined
    })
    if (object.id) newObject.id = object.id

    return newObject
}


/**
 * Zwraca listę spłaszczonych obiektów na podstawie kluczy przekazanych w argumencie `columnsStringList` oraz na podstawie `populateSchemaList`,
 * która określa ścieżki populacji. Dzięki temu można określić, które klucze są zagnieżdżone pod innymi kluczami jako obiekt.
 * 
 * Funkcja wykorzystuje `makeObjectFlat` do spłaszczenia każdego obiektu w tablicy `objectsList`, przekształcając zagnieżdżone dane 
 * na poziom główny obiektu zgodnie z podanymi parametrami.
 * 
 * @param {Array<Object>} objectsList - Tablica obiektów do spłaszczenia.
 * 
 * @param {Array<string>} columnsQueryArray - Tablica kluczy kolumn, np. `['column1', 'column2', 'column3']`.
 *   Jest to lista kluczy, które mają zostać uwzględnione w wyniku spłaszczonego obiektu.
 *
 * @param {Array<Object>} populateSchemaList - Tablica obiektów określających konfigurację ścieżek i kluczy do operacji `populate`.
 *   Każdy obiekt zawiera właściwości:
 *   - `path`: {string} - Ścieżka w schemacie Mongoose do powiązanego dokumentu.
 *   - `keys`: {Array<string>} - Lista kluczy, które mają zostać załadowane z powiązanego dokumentu.
 *   - `as` (opcjonalne): {Object} - Opcjonalny obiekt, który pozwala na nadanie aliasów kluczom w ramach `populate`.
 *
 *   Przykładowy format:
 *   ```javascript
 *   [
 *      {
 *         path: 'nazwa_ścieżki_mongoose',
 *         keys: ['klucz1', 'klucz2', 'klucz3'],
 *         as: { 'klucz1': 'customKeyName' }
 *       },
 *      {
 *         path: 'nazwa_ścieżki_mongoose2',
 *         keys: ['klucz4', 'klucz5']
 *       },
 *      // więcej obiektów
 *   ]
 *   ```
 * 
 * @returns {newObjectList: Array<Object>} - Lista obiektów po spłaszczeniu, gdzie każdy obiekt w `objectsList` 
 *   został przekształcony za pomocą funkcji `makeObjectFlat`.
 */
const makeObjectListFlat = (objectsList, columnsQueryArray, populateSchemaList) => {
    return objectsList.map((object) => makeObjectFlat(object, columnsQueryArray, populateSchemaList))
}

module.exports = { getQueryFromColumnsList, makeObjectFlat, makeObjectListFlat }